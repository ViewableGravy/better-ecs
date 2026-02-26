---
name: react_comment-structure
description: Enforce required comment structure when writing React code, including top-level and inline section ordering.
---

# React Comment Structure

## Purpose

Ensure every React authoring edit follows a consistent, predictable comment structure for top-level sections and in-component sections.

## When to use

- When writing or modifying code in React files (for example `.tsx` files, React components, or React hooks).
- Before adding new state, hooks, effects, utility functions, render helpers, or JSX in a React component.
- When refactoring React component structure and section ordering.

## Do not use

- When only reading, reviewing, or explaining React code without writing.
- When editing non-React files.

## Behavior

1. **Always apply on React writes**: If code is being written in a React file, this skill must be used.
2. **Never apply on React reads**: If no code is being written, do not apply this skill.
3. **Use top-level 3-line section comments when applicable**:
   - `TYPE DEFINITIONS`
   - `CONSTS`
   - `COMPONENT START` (or `HOOK START` for top-level hooks)
4. **Top-level order is strict**: `TYPE DEFINITIONS` → `CONSTS` → `COMPONENT START`/`HOOK START`.
5. **Create top-level sections only when they exist**: Do not add an empty heading for missing content.
6. **Use inline 1-line section comments inside React components in this default order**:
   - `STATE`
   - `HOOKS`
   - `QUERIES`
   - `EFFECTS`
   - `FUNCTIONS`
   - `RENDER HELPERS`
   - `RENDER`
7. **Dependency exception**: Inline sections may appear out of order only when a section depends on a previous section and moving it would break clarity or correctness.
8. **Category mapping rules**:
   - `STATE`: `useState`, refs, `useToggle`.
   - `HOOKS`: hooks not covered by other categories.
   - `QUERIES`: TanStack query usage.
   - `EFFECTS`: `useEffect`, `useLayoutEffect`.
   - `FUNCTIONS`: utility functions, including `useCallback`.
   - `RENDER HELPERS`: values or helpers for render, including `useMemo`.
   - `RENDER`: directly above returned JSX.

## Comment format

Use this exact format for top-level sections:

```ts
/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
```

Use this exact format for inline sections:

```ts
/***** STATE *****/
```

## Implementation notes

- Apply these comments to all React components and top-level React hooks authored in this repository.
- Keep comments concise and consistent; do not invent alternate headings or casing.
