---
name: react_always
description: MUST ALWAYS be used when writing or modifying React files in this repository.
---

# React Always

## Purpose

Provide mandatory React authoring rules that should always be applied whenever React code is touched.

## When to use

- Any edit in `.tsx` files.
- Any change to React components, hooks, or JSX render logic.
- Any refactor that affects React rendering behavior.

## Behavior

- When conditionally rendering, always use `&&` syntax: for booleans use `{myBool && ...}` and for non-boolean values use `{!!myVar && ...}`.
- Prefer explicit, minimal props and derive contextual values via established React context hooks when available.
- Keep render trees simple and avoid duplicate JSX branches when a single branch with derived values can express the same logic.
