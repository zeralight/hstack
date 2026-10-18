#!/usr/bin/env node
// Validates the plugin layout and the harness-neutral port. Run from anywhere: `node scripts/check.mjs`.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGINS = join(ROOT, "plugins");
const problems = [];
const fail = (message) => problems.push(message);

// Names that only make sense in Cursor or inside the full pstack plugin. The skills here must stand alone.
const FOREIGN = [
	[/generalPurpose/, "Cursor subagent type"],
	[/readonly: (true|false)|readonly\/Ask/, "Cursor readonly flag"],
	[/pstack-models|setup-pstack|inherit-parent/, "pstack model rule"],
	[/\.cursor\/|\.cursor-plugin|agent-transcripts/, "Cursor path"],
	[/`Task`|\bTask (tool|subagent|call)/, "Cursor Task tool"],
	[/AskQuestion/, "Cursor AskQuestion tool"],
	[/\btodolist\b/, "Cursor todolist"],
	[/\b(grok|composer)-\d|claude-[a-z]+-\d-\d/, "Cursor model slug"],
	[/poteto-mode|poteto-agent|principle-[a-z]|\*\*[a-z-]+\*\* principle/, "pstack skill not in this repo"],
	[/\barena\b|\*\*architect\*\*|`\/?architect`|\barchitect (sketch|skill|shapes)\b|maintain-verification-skill|\/visualize|\bswarm\b/, "pstack skill not in this repo"],
	[/\bBugbot\b|Cursor [Aa]utomation/, "Cursor-only feature"],
];

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		if (name === ".DS_Store") return [];
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

function frontmatter(path) {
	const block = readFileSync(path, "utf8").match(/^---\n([\s\S]*?)\n---\n/)?.[1];
	if (block === undefined) return undefined;
	const fields = {};
	for (const line of block.split("\n")) {
		const match = line.match(/^([a-z-]+):\s*(.*)$/);
		if (match) fields[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
	}
	return fields;
}

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const marketplace = json(join(ROOT, ".claude-plugin/marketplace.json"));
const listed = new Map(marketplace.plugins.map((entry) => [entry.name, entry]));
const dirs = readdirSync(PLUGINS).filter((name) => statSync(join(PLUGINS, name)).isDirectory());

for (const name of dirs) if (!listed.has(name)) fail(`plugins/${name} is not in marketplace.json`);
for (const [name, entry] of listed) {
	if (!dirs.includes(name)) fail(`marketplace.json lists ${name}, which has no plugins/${name}`);
	if (entry.source !== `./plugins/${name}`) fail(`marketplace.json ${name} source is ${entry.source}`);
}

for (const name of dirs) {
	const plugin = join(PLUGINS, name);
	const manifestPath = join(plugin, ".claude-plugin/plugin.json");
	if (!existsSync(manifestPath)) {
		fail(`plugins/${name} has no .claude-plugin/plugin.json`);
		continue;
	}
	const manifest = json(manifestPath);
	const entry = listed.get(name) ?? {};
	if (manifest.name !== name) fail(`plugins/${name}/plugin.json name is ${manifest.name}`);
	for (const key of ["version", "description", "author", "keywords"]) {
		if (JSON.stringify(manifest[key]) !== JSON.stringify(entry[key])) fail(`plugins/${name} ${key} differs between plugin.json and marketplace.json`);
	}
	if (manifest.license !== "MIT") fail(`plugins/${name}/plugin.json license is ${manifest.license}`);

	// npx skills copies only the skill folder, so a bundled agent needs a copy inside it for other harnesses.
	for (const agent of manifest.agents ?? []) {
		const agentPath = join(plugin, agent);
		if (!existsSync(agentPath)) {
			fail(`plugins/${name} declares missing agent ${agent}`);
			continue;
		}
		const copy = join(plugin, "skills", name, "references", agent.split("/").pop());
		if (!existsSync(copy) || readFileSync(copy, "utf8") !== readFileSync(agentPath, "utf8")) {
			fail(`plugins/${name}: ${relative(plugin, copy)} must be an exact copy of ${agent}`);
		}
	}

	const skills = readdirSync(join(plugin, "skills"));
	if (skills.length !== 1 || skills[0] !== name) fail(`plugins/${name}/skills must hold exactly one skill named ${name}`);
	const skill = join(plugin, "skills", name);
	const fields = frontmatter(join(skill, "SKILL.md"));
	if (!fields) {
		fail(`plugins/${name}/skills/${name}/SKILL.md has no frontmatter`);
		continue;
	}
	if (fields.name !== name) fail(`${name}/SKILL.md name is ${fields.name}`);
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) fail(`${name} is not a valid Agent Skills name`);
	if (!fields.description || fields.description.length > 1024) fail(`${name}/SKILL.md description is missing or over 1024 characters`);

	const policy = join(skill, "agents/openai.yaml");
	const implicit = existsSync(policy) && /allow_implicit_invocation:\s*false/.test(readFileSync(policy, "utf8"));
	if ((fields["disable-model-invocation"] === "true") !== implicit) {
		fail(`${name}: disable-model-invocation and agents/openai.yaml allow_implicit_invocation disagree`);
	}

	for (const path of walk(skill)) {
		const rel = relative(ROOT, path);
		if (path.includes("/scripts/") && !(statSync(path).mode & 0o111)) fail(`${rel} is not executable`);
		if (!path.endsWith(".md")) continue;
		const text = readFileSync(path, "utf8");
		text.split("\n").forEach((line, index) => {
			for (const [re, why] of FOREIGN) if (re.test(line)) fail(`${rel}:${index + 1} ${why}: ${line.trim().slice(0, 100)}`);
		});
		for (const [, href] of text.matchAll(/\]\(([^)\s#]+)[^)]*\)/g)) {
			// Skip URLs and template placeholders such as `[PR #123](url)`.
			if (/^[a-z]+:/i.test(href) || !/[./]/.test(href)) continue;
			const target = resolve(dirname(path), href);
			if (!existsSync(target)) fail(`${rel} links to missing ${href}`);
			else if (relative(skill, target).startsWith("..")) fail(`${rel} links outside its skill folder: ${href}`);
		}
		// Skills name their bundled files as `references/...` or `scripts/...`, relative to the skill folder.
		for (const [, ref] of text.matchAll(/`((?:references|scripts)\/[^`\s<>]+)`/g)) {
			if (!existsSync(join(skill, ref))) fail(`${rel} names missing ${ref}`);
		}
	}
}

for (const path of walk(join(PLUGINS, "no-comments/agents"))) {
	const fields = frontmatter(path);
	if (!fields?.name || !fields?.description) fail(`${relative(ROOT, path)} needs name and description frontmatter`);
}

// Behavior check for the show-me-your-work log helper.
const log = join(PLUGINS, "show-me-your-work/skills/show-me-your-work/scripts/log.sh");
const scratch = mkdtempSync(join(tmpdir(), "hstack-check-"));
try {
	const file = join(scratch, "nested/decisions.tsv");
	execFileSync(log, [file, "frame", "=HYPERLINK(1)", "tab\there", "line\nbreak", "ok"]);
	execFileSync(log, [file, "build", "second", "why", "-1", "@x"]);
	const rows = readFileSync(file, "utf8").trimEnd().split("\n").map((row) => row.split("\t"));
	const header = "ts phase decision why evidence result";
	if (rows[0].join(" ") !== header) fail(`log.sh header is ${rows[0].join(" ")}`);
	if (rows.length !== 3 || rows.some((row) => row.length !== 6)) fail("log.sh did not write 3 rows of 6 cells");
	if (rows[1][2] !== "'=HYPERLINK(1)" || rows[2][4] !== "'-1" || rows[2][5] !== "'@x") fail("log.sh did not quote formula cells");
	if (rows[1][3] !== "tab here" || rows[1][4] !== "line break") fail("log.sh did not flatten tabs and newlines");
	if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(rows[1][0])) fail(`log.sh timestamp is ${rows[1][0]}`);
	let usage = false;
	try {
		execFileSync(log, [file, "too", "few"], { stdio: "pipe" });
	} catch {
		usage = true;
	}
	if (!usage) fail("log.sh accepted the wrong number of arguments");
} finally {
	rmSync(scratch, { recursive: true, force: true });
}

for (const problem of problems) console.log(`FAIL ${problem}`);
if (problems.length > 0) process.exit(1);
console.log(`ok: ${dirs.length} plugins, marketplace, Codex policies, links, port, and log.sh`);
