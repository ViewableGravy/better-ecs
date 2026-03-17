---
name: engine-systems
description: Folder and file structure conventions for engine and app systems in this repository.
---

# Engine Systems

## Purpose

Capture the repository's required structure for system implementations so system entry files stay declarative and consistent.

## When to use

- Creating a new system.
- Refactoring an existing system.
- Reviewing whether system logic is structured correctly.

## Behavior

1. Give every system its own dedicated folder, with the system declaration living in `index.ts`.
2. Keep exactly one `createSystem(...)` or `serializationSystem(...)` call in that `index.ts` file.
3. Move helper logic out of the system entry file into `utilities.ts`, `const.ts`, or a focused subfolder when the logic grows.

## Rules

- Treat `index.ts` as orchestration-only: read context, call helpers, and return early when guards fail.
- Put reusable helper functions in `utilities.ts` inside the same system folder unless a more focused subfolder is warranted.
- Put system constants in `const.ts`.
- If helper logic becomes domain-sized, split it into a named subfolder instead of growing `utilities.ts` indefinitely.