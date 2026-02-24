---
name: css_general
description: General guidelines for writing CSS, structuring stylesheets, and scoping styles to components.
---

# General CSS Guidelines

## Purpose

To maintain modular, scoped, and manageable CSS files that are closely tied to their respective React components.

## When to use

- When deciding where to place CSS for a new component.
- When breaking down large CSS files.
- When structuring styles for complex components or forms.

## Behavior

1. **Reduce global styling**: Prefer creating a new CSS file for any given component rather than adding to global stylesheets.
2. **One stylesheet per component**: As a general rule, each component should have its own stylesheet.
3. **Exceptions for logical grouping**: If a component is specifically splitting up code and logically relates to the parent (e.g., breaking up a large form for readability), they may share the parent's classname/file.
4. **Separate files for unrelated/shared components**: Unrelated components, compound components, shared components, etc., must have their own CSS file.
5. **Leaf nodes**: Only consider leaf nodes as being able to share a `className`.
6. **File size limits**: Try to avoid CSS files over 100 lines, and very rarely over 200 lines. If larger, break the file up into smaller, more relevant CSS files.
7. **Maximum 2 layers of depth**: CSS files should NEVER apply to components through more than 2 layers. For example, a parent form and its sub-fields may share a CSS file, but if those sub-fields have their own children components, those fields should have their own CSS files.
8. **Bottom-up scoping**: CSS can only apply to the current component and one layer down. A parent of a parent should not have its CSS apply to the child parent, as it should be its own boundary.

## CSS Template

When creating a new CSS file, use the [css template](./TEMPLATE.md). Use camelCase for all class names.
