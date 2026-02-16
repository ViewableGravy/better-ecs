---
name: nx-verify
description: Run post-change Nx verification (typecheck, lint, test) with static terminal output for one or more projects.
---

# Nx Verify Skill

Use this skill at the end of implementation to run a consistent verification flow.

## When to use

- After code changes to confirm quality gates
- Before handoff/commit
- When you need a single command for typecheck + lint + test

## Command

Run:

- [verify-projects.mjs](./scripts/verify-projects.mjs)

Example:

- `bun .github/skills/nx-verify/scripts/verify-projects.mjs engine client`
- `bun run verify:projects -- engine client`

## Behavior

The script runs in order for the selected projects:

1. `typecheck`
2. `lint`
3. `test`

All commands run through Nx with static terminal output:

- `NX_TERMINAL_OUTPUT_STYLE=static`
- `--outputStyle=static`

The script stops on first failure and exits non-zero.
