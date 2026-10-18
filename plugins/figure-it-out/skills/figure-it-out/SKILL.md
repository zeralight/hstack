---
name: figure-it-out
description: "Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and logs decisions. Use for /figure-it-out or 'figure it out'."
disable-model-invocation: true
---

# Figure it out

When the task matches no playbook, design one. The deliverable before any code is the workflow itself: a sequence of phases that scales rigor to the task, runs the scientific method, and leaves a decision trail a human can audit after stepping away.

## Start

Open a todo list with the phases below. Use your harness's todo tool if it has one. Otherwise keep the list in your reply and update it at each phase.

## Phase A: Frame

Ground first, then commit. Don't start the run until you can state:

- The definition of done as a falsifiable predicate, checked against the real artifact, not a proxy, a self-report, or "it compiles".
- Scope, quantified: rough units and effort, plus the blockers grounding surfaced.
- The rigor level, biased high. One-way doors and high blast radius get more. Reversible low-stakes steps get less. Rigor is gates and artifacts, not "try harder".

Present the framing and tradeoffs before committing to a long run. Reversible work proceeds without asking, but a multi-hour run earns one checkpoint.

## Phase B: Design the workflow

Decompose into atomic, independently-landable units. Sequence riskiest-unknown-first. Scaffold and verification come before features. Get the core types and data structures right first, so the code built on them is obvious.

- Build the verification harness before the work, with the baseline captured from the pre-change state, so the check reads as "old value vs new value".
- For one-way-door design decisions, sketch the shape before code: types, signatures, and module boundaries with stub bodies. Have two or three independent subagents sketch it from the same brief, on different models when your harness offers them. Pick the strongest sketch and graft in the best parts of the others. Skip this for mechanical work whose shape is already concrete. A second round over a settled design is over-engineering. Bias toward the smallest change that solves the problem.
- Decide what fans out. Parallelize only across seams, and give each worker its own worktree or branch, so no two workers write the same file, branch, or state. Don't over-fan. Pick each subagent's model and effort for its job: your strongest model for hard design and judgment, a faster one for routine edits.
- Write the designed phase list down. That list is what the human reviews.

Then execute the design. Add its steps to the todo list as concrete items between the Phase C and Phase D entries. Run each under the Phase C loop discipline, and weave the Phase D log through them, a row as each step lands, rather than saving the whole trail for the end.

## Phase C: Run the loop

Each unit is an experiment. State the hypothesis, make the smallest change, measure against the predicate on the real artifact, keep it if it advanced, revert it if it didn't. Each unit ends in a verifiable state. Verify it before starting the next instead of batching checks at the end.

- Verify by inspecting the artifact, never a self-report. When something passes too easily, suspect the observation method before the system.
- Pair delegated work with a judge. If a worker games the gate, reset and harden the contract. If the gate itself is wrong, fix the gate in its own change rather than routing around it.
- A verdict is VERIFIED, NOT VERIFIED, or INCONCLUSIVE. Inconclusive is not a pass. Don't hide a negative.

## Phase D: Keep the audit trail

Log the run via the **show-me-your-work** skill. figure-it-out's work is usually ambitious enough to commit the trail so the reviewer can read it in the PR. The trail plus the diff is what lets the human come back and trust the work.

## Phase E: Verify and hand back

Check the whole against the Phase A predicate on the real product, not just the harness. Encode any recurring correction as a gate, a lint rule, a check, or a script, not more written instructions.

**Reply:** the playbook you designed, the rigor level and why, the decision-trail path, what's verified against the predicate, and what's still open.
