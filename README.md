# hstack

Agent skills from [pstack](https://github.com/cursor/plugins/tree/main/pstack), [Lauren Tan](https://x.com/poteto)'s Cursor plugin, plus `make-pr-easy-to-review` from Cursor's [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit), ported so they run in Claude Code, Codex, Pi, and any other harness that reads [Agent Skills](https://agentskills.io).

Each skill is its own Claude Code plugin under `plugins/<name>/`, and the same folder installs into any harness with `npx skills`.

## Installation

Install one skill into any supported harness:

```bash
npx skills add zeralight/hstack --skill SKILLNAME
```

Pass `--skill` more than once to install several, or `--skill '*'` for all of them. `npx skills` installs to `.claude/skills/` for Claude Code and to `.agents/skills/` for Codex and Pi. Add `-g` to install for your user instead of the current project.

In Claude Code you can install from the plugin marketplace instead:

```bash
/plugin marketplace add zeralight/hstack
/plugin install SKILLNAME@hstack
```

## Invoking a skill

Every skill except `make-pr-easy-to-review` runs only when you ask for it. The model can start `make-pr-easy-to-review` on its own when you ask to tidy a PR, and it asks before it rewrites history.

| Harness | Command |
| --- | --- |
| Claude Code, installed with `npx skills` | `/how` |
| Claude Code, installed as a plugin | `/how:how` |
| Codex | `$how` |
| Pi | `/skill:how` |

Text after the command is the request, for example `/why does the retry loop cap at 3`.

## Available skills

### Understand code

| Skill | What it does | Works best with |
| --- | --- | --- |
| `how` | Explains how a subsystem works. Parallel explorers trace it, and one explainer writes the architecture down. | |
| `why` | Finds why code is shaped the way it is. It searches git, PRs, and every MCP you have connected, such as a ticket tracker, docs, chat, telemetry, and error tracking, and reports what it found with a confidence level for each claim. | MCP servers for your tracker, docs, and chat |
| `teach` | Explains a change or subsystem at your pace, built from what `how` and `why` find. | `how`, `why`, `unslop` |
| `blast-radius` | Finds what a change breaks outside the diff, and proves the one fact it's safe because of by running real code. | `why`, `unslop` |

### Review and fix

| Skill | What it does | Works best with |
| --- | --- | --- |
| `interrogate` | Adversarial code review by one reviewer per model, merged into a verdict: act on, consider, noted, dismissed. It never applies changes. | |
| `no-comments` | Runs the Comment Sicko subagent over a diff, deletes comments that explain bad code, fixes the code, and offers to enforce claimed constraints with types, tests, or lints. | `how`, `why` |
| `correct` | Finds the mistakes agents keep repeating in a repo and makes each one impossible, preferring architecture, then types, then lints, then tests, then docs. | |
| `make-pr-easy-to-review` | Makes a PR easy to review without changing what the code does. It regroups noisy commits in dependency order, checks that the code is identical afterward, and rewrites the description with a TL;DR, risks, and where to start reading. | |
| `create-verification-skill` | Generates a project-local skill that launches your app, drives it the way a user does, and captures proof. | |

### Plan and run long work

| Skill | What it does | Works best with |
| --- | --- | --- |
| `sharpen` | Sharpens a task before starting: the expert approach, the real goal, and the right level of detail. | |
| `figure-it-out` | Designs a playbook for a large or ambiguous change, runs it as a hypothesis loop, and keeps an audit trail. | `show-me-your-work` |
| `show-me-your-work` | Keeps a TSV decision log for long or unattended runs, audits it against the transcript, and has a second model review it. | `unslop` |

### Communicate

| Skill | What it does | Works best with |
| --- | --- | --- |
| `ketchup` | Catches you up on what changed since your last message, and lists every decision waiting on you with what you need to make it. | `bro` |
| `bro` | Restates the last message in plain words. | |
| `in-your-own-words` | Restates what the agent thinks your goal is, so you can correct it early. | |
| `technical-writing` | A writing standard for docs, RFCs, READMEs, PR descriptions, and commit messages. | `unslop` |
| `unslop` | Removes AI writing tells from any text. | |

A skill in the "Works best with" column is optional. When it isn't installed, the skill does that part itself.

## How the port differs from the originals

The pstack skill text is unchanged except for these points:

- **Subagents.** Cursor's `Task` tool, `generalPurpose` type, and `readonly` flag became plain instructions to spawn a subagent and tell it not to edit files, with the Claude Code name where it helps. Each skill that spawns subagents also says what to do in a harness that can't spawn them.
- **Models.** pstack picks a model per role from `pstack-models.mdc`, with Grok and Claude defaults. Here, each skill says which roles need your strongest model and which can use a faster one. `interrogate` and `show-me-your-work` use different model families when the harness offers them, and say so when it doesn't.
- **Paths.** `.cursor/skills/` and Cursor transcript paths became the Claude Code, Codex, and Pi equivalents.
- **Skills outside this repo.** pstack's `poteto-mode`, `architect`, `arena`, `maintain-verification-skill`, and principle skills aren't ported. Where a skill called one of them, the step now says what that skill would have done in a sentence or two.
- **Comment Sicko.** The `no-comments` plugin bundles the `comment-sicko` agent for Claude Code and keeps a copy in `references/` that other harnesses pass to a general subagent.
- **Codex.** Each skill that sets `disable-model-invocation: true` has `agents/openai.yaml` with `allow_implicit_invocation: false`, so Codex also runs it only on request.

`make-pr-easy-to-review` needed no changes. It already used only `git` and `gh`.

## Development

Run the checks before you commit:

```bash
node scripts/check.mjs
```

It checks that every plugin folder, `plugin.json`, and marketplace entry agree, that each skill's frontmatter and Codex policy match, that links stay inside the skill folder that `npx skills` copies, that the two Comment Sicko copies match, and that no Cursor-only or unported pstack name is left in a skill. It also runs `show-me-your-work`'s `log.sh` and checks its output.

## Credits

The pstack skills are by Lauren Tan, from [pstack](https://github.com/cursor/plugins/tree/main/pstack), ported from commit `0b8e952` (pstack 0.15.26). `make-pr-easy-to-review` is by Eric Zakariasson, from [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit) at commit `bca6129`. The port is by zeralight. The repo layout follows [humanlayer/skills](https://github.com/humanlayer/skills).

MIT licensed. See [LICENSE](LICENSE).
