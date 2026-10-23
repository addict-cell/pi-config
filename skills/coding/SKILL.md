---
name: coding
description: "REQUIRED: read this before writing or editing code or tests, even for one-line fixes, and before reviewing code changes. It defines the mandatory workflow: inspect project conventions first, apply KISS/YAGNI/single responsibility/DRY, stay within scope, run the project's real checks, and finish with a 5-point self-review report. Skip only for pure questions with no file changes."
---

# Coding

Work as a senior engineer inside the project's existing architecture. Project instructions (AGENTS.md etc.) and the user's approval requirements override this skill.

## Hard rules

Breaking any of these fails the task:

1. **Read before writing.** Open the target code, its callers, and its tests before editing.
2. **Use what the project already uses.** That means its stack, helpers, naming, imports, error handling, and test style. Ask before adding dependencies, abstractions, or new patterns.
3. **Stay in scope.** Change only what was asked and preserve unrelated user changes. Ask before expanding scope, changing public contracts, or doing anything destructive.
4. **Never invent.** Commands, scripts, APIs, and requirements must come from the repo or the user. Separate confirmed facts from inferences. Ask when a gap affects correctness.
5. **Never claim a check passed unless it ran and passed.**

## 1. Inspect (proportional to the task)

- **Small fix:** read the affected code and its immediate context.
- **Larger or cross-cutting change:** also read AGENTS.md, README, and CONTRIBUTING; the package manifest; the lint, format, type, and framework config; 3–5 representative source files; and the relevant tests.

Note naming, imports/exports, module boundaries, data flow, state, API access, error handling, logging, and test conventions (location, fixtures, mock vs real services).

## 2. Implement

- **KISS:** pick the simplest solution that works.
- **YAGNI:** build only what is needed now.
- **Single responsibility:** each function or file does one job. Keep UI, state, logic, and types apart.
- **DRY:** keep one source of truth. Don't force an abstraction just because two snippets look alike.
- Handle null, undefined, invalid-input, and failure cases explicitly.
- Don't hardcode secrets or log sensitive values. Follow the project's config and environment-variable conventions.
- Update the types, callers, tests, and API specs the change requires. If that goes beyond scope, stop and ask.
- **File size:** if a new or modified handwritten source file (tests included) exceeds about 200 lines, check whether it holds separable responsibilities. This is advisory. Split only when the result is clearer, and explain any exception in the report. Exclude generated files, lockfiles, fixtures, docs, and vendored code. A project policy takes precedence.

## 3. Validate

- Use only commands found in the project's scripts, config, or docs. Don't assume a package manager or test framework.
- Add or update focused tests for the changed behavior, following existing conventions.
- Run the relevant tests plus lint, format, type, and build checks.
- Don't install dependencies, alter external data, or run destructive setup just to validate. Ask when approval is required.
- If a check can't run, report the exact blocker. Separate new failures from confirmed pre-existing ones.
- For instructions-only or docs-only changes, use read-only structural checks instead of application tests.

## 4. Self-review (max 3 rounds)

Review the final diff. Mark each item **PASS**, **FAIL**, or **NOT CHECKED** with brief evidence. NOT CHECKED is not a pass.

1. **Scope:** the change meets the request, has no unrelated edits, and preserves user work.
2. **Conventions and principles:** it matches the project's architecture, naming, and formatting, and follows KISS, YAGNI, single responsibility, and DRY.
3. **Correctness and edge cases:** behavior, callers, contracts, error handling, and null, invalid, and failure paths are covered.
4. **Secrets and security:** no exposed secrets, no sensitive logging, and no new risk.
5. **Validation:** the applicable checks ran successfully on the final version.

If any item is not PASS, fix it within scope, recheck, and start the next round. If you are blocked by access, tools, or an approval, ask for the specific decision you need. After round 3, stop and report what remains unresolved. Never weaken tests, suppress failures, or change acceptance criteria to get a pass.

## 5. Report

- What changed: the behavior and affected paths.
- The 5 statuses with evidence, and the number of rounds used.
- The commands or checks run, with their actual results.
- Report an overall pass only when all 5 items are PASS. If user action is needed, end with one concrete next step.
