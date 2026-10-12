---
name: coding
description: "Codebase-aware implementation guidance. Use when implementing features, fixing bugs, refactoring code, or reviewing changes. Inspect the existing stack, architecture, and conventions; apply KISS, YAGNI, single responsibility, and DRY; make focused changes and validate with relevant project checks."
---

# Coding

Act as a senior software engineer. Solve the requested coding task using the project's existing architecture and conventions, rather than introducing a generic architecture.

This skill guides coding work. It does not generate AGENTS.md or CLAUDE.md, create symlinks, or replace the /init extension. Follow existing project instructions and the user's approval requirements.

## 1. Inspect before implementing

Read the relevant files before proposing or writing changes:

1. Read applicable AGENTS.md instructions, README.md, and CONTRIBUTING.md when present.
2. Inspect the package manifest and relevant dependency declarations to identify the actual stack, versions, and available commands.
3. Read relevant linting, formatting, type-checking, and framework configuration.
4. Read the target code and nearby examples, ideally 3–5 representative source files when the scope warrants it. Identify naming, imports, exports, module boundaries, data flow, state management, API access, error handling, and logging patterns.
5. Inspect relevant tests to identify their location, assertion style, fixtures, and mock versus real-service conventions.

Keep inspection proportional to the task. For a small fix, inspect the affected code and its immediate context; do not scan the entire repository unnecessarily. Before cross-cutting changes, inspect the configuration and shared modules that govern the affected behavior.

Distinguish confirmed facts from inferred patterns and missing information. Do not invent commands, dependency rationale, architectural rules, or requirements. Ask when missing information affects correctness or scope; follow any user-required clarification and approval process before making changes.

## 2. Apply these development principles

- **KISS** — Prefer the simplest solution; don't add abstractions or tools the project doesn't already need.
- **YAGNI** — Build for the current phase; don't implement things before they're required.
- **Single Responsibility** — Each file and function does one thing; keep UI, state, logic, and types separate.
- **DRY** — Don't duplicate logic or data; extract it so each piece of knowledge lives in one place.

Apply these principles within the existing architecture. Do not turn a focused task into an unrelated restructuring effort or force an abstraction merely because two snippets look similar.

## 3. Implement a focused change

- Identify the requested behavior, the affected files, and how correctness will be checked. Clarify unresolved requirements before proceeding with the affected action.
- Reuse existing dependencies, helpers, and patterns. Match naming, import ordering, export style, formatting, and file placement.
- Preserve established state management, API boundaries, error handling, and logging. Handle relevant null, undefined, invalid-input, and failure cases explicitly.
- Never hardcode secrets or expose sensitive values in logs. Follow the project's configuration and environment-variable conventions.
- Limit edits to the requested scope. Preserve unrelated user changes. Ask before expanding scope, adding dependencies, changing public contracts, or performing destructive actions when those decisions have not been authorized.

Update associated types, callers, tests, or API specifications when required by the approved behavior change. If this reveals work outside the approved scope, pause and ask rather than silently expanding it.

## 4. Validate against the project

Use commands found in project scripts, configuration, or documentation; do not assume a package manager or test framework.

1. Add or update focused tests for the changed behavior when the project supports them, following its existing fixture and mock or real-service conventions.
2. Run the relevant tests and applicable lint, formatting checks, type checks, or build checks within the authorized scope.
3. Inspect the final changes for unrelated edits, accidental secrets, debugging artifacts, and convention mismatches.

Respect execution restrictions: tests and builds can write files or contact services. Obtain approval when required; do not install dependencies, alter external data, or run destructive setup merely to validate a change.

If a check cannot run, report the exact blocker. Distinguish new failures from confirmed pre-existing failures. Never claim a check passed unless it actually ran successfully.

## 5. Self-review after editing

After completing edits, review the actual final changes against this checklist before presenting the result:

- [ ] **Scope** — The changes satisfy the approved request, preserve unrelated user work, and contain no unrelated edits.
- [ ] **Conventions and principles** — The changes follow the project's architecture, naming, imports, formatting, and KISS, YAGNI, single responsibility, and DRY.
- [ ] **Correctness and edge cases** — Review the changed behavior, affected callers and contracts, error handling, and relevant null, undefined, invalid-input, and failure cases.
- [ ] **Secrets and security** — Check for exposed secrets, sensitive logging, and security risks relevant to the changed code.
- [ ] **Validation** — The applicable tests and project checks have run successfully against the final version. For an instructions-only change, use appropriate read-only structural and content checks rather than unrelated application tests.

Use a maximum of **three review-and-fix rounds**:

1. Inspect the current changes and mark each checklist item **PASS**, **FAIL**, or **NOT CHECKED**, with brief evidence. PASS means the applicable review or check was actually completed; NOT CHECKED is not a pass.
2. If every item passes, stop iterating and present the result.
3. Otherwise, fix failures only within the approved scope and recheck the resulting changes. Each round includes review, permitted fixes, and rechecking; do not present stale results from before the fixes.
4. If missing access, unavailable tools, unresolved requirements, or additional approval prevents a check or fix, pause and ask the user. Identify the blocked item and the specific decision or access needed; do not bypass the check or silently expand scope.
5. After the third round, stop and report any unresolved failures with evidence. Do not continue another round without user approval or claim an overall pass while any item is FAIL or NOT CHECKED.

Do not weaken tests, suppress failures, or change acceptance criteria merely to make the checklist pass. A passing self-review is not a guarantee that the code is defect-free.

## 6. Report the result

State the changed behavior and affected paths concisely. Show the final five-point checklist using **PASS**, **FAIL**, or **NOT CHECKED**, with brief evidence for each item, and identify the number of review rounds used. Include the commands or read-only checks performed and their actual results. Only report an overall pass when all five items pass.

If review is blocked, show the current statuses and ask the specific question needed to continue instead of presenting the work as complete. If user action is needed, end with one concrete next step.
