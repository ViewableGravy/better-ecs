---
name: code-structure
description: Captures preferred file/folder structure conventions for implementation work.
---

# code-structure

Purpose
- Capture preferred file/folder structure conventions for future implementation work.

## File organization
- Keep files in this order:
  1. imports
  2. type definitions
  3. component/function/class implementation
- Use section headers:

```ts
/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
```

```ts
/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
```

## Function signatures and typing
- Avoid non-primitive inline object/tuple return/argument types in function signatures.
- Define named `type` aliases immediately above usage.

## System file goals
- System files should be declarative and orchestration-oriented.
- Move detailed logic into neighboring helper modules.
- Keep system files concise (roughly one-screen when practical).

## State and constants
- `const` values live in a dedicated `const.ts` module.
- Dynamic mutable state belongs in system schema/state structures.
- Avoid top-level `let` in system modules unless there is no better lifecycle-bound alternative.

## Splitting strategy
- If constants + functions remain small (< ~100 lines), static class approach is acceptable.
- If larger, split into folder modules (`index.ts`, `const.ts`, and feature-grouped files).
