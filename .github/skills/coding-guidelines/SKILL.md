---
name: coding-guidelines
description: General code-writing preferences for this repository. Use when implementing or refactoring code so new changes follow the project's expected style.
---

# Coding Guidelines

## Purpose

Capture recurring code-style preferences that should shape day-to-day implementation work.

## When to use

- Writing new application or library code.
- Refactoring existing code while preserving behavior.
- Reviewing implementation structure before finalizing edits.

## Guidelines

1. Avoid nested ternary expressions.
   - If the logic is non-trivial, use `if` statements or extract a helper function.
2. Prefer array destructuring when reading array items into named variables.
   - Example: prefer `const [item] = items;` over `const item = items[0];`
3. Keep code readable for someone with less context than the original author.
   - Use small helpers, clear names, and targeted comments where they reduce ambiguity.
4. Prefer deferred TypeScript inference at factory boundaries.
   - Keep explicit return types only where they prevent a known circular type issue, such as `initializeContext`.
   - `createRenderPipeline` may take explicit registry and state generics when it owns application-specific render state.
   - Keep curried factories such as `createRenderPass` deferred so their inner function infers the created value's type.
5. Put top-level type definitions immediately below imports.
   - Add the file's standard type-definition section before values, helpers, or exports.
   - Render-pass files should include a render-pass section comment around the pass declaration.
