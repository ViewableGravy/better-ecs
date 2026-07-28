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
