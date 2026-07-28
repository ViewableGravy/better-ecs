---
name: css_classname-naming
description: Guidelines for naming CSS classnames using CSS Modules in React components.
---

# CSS Classname Naming (CSS Modules)

## Purpose

To ensure consistent, predictable, and maintainable CSS classnames across the codebase using CSS Modules. Since CSS Modules automatically scope styles locally, we avoid complex naming conventions like BEM in favor of simple, descriptive camelCase names.

## When to use

- When creating new React components that require styling.
- When refactoring existing components with classnames.
- When adding conditional styles or modifiers to elements.

## Behavior

1. **Use camelCase**: Always prefer `camelCase` for class names so they can be accessed via dot notation (e.g., `styles.myClass`). Do not use kebab-case (e.g., `my-class`).
2. **No BEM required**: Because CSS modules provide isolation, BEM naming (`__` and `--`) is unnecessary. Use simple, descriptive names (e.g., `header`, `submitButton`).
3. **Root element naming**: The root element of a component should match the component's name but in `camelCase` (e.g., `myComponent` for `<MyComponent />`), or simply use `root`.
4. **Modifiers are for conditionals**: Use descriptive camelCase names for conditional states (e.g., `isActive`, `isDisabled`, `hasError`). Apply them alongside the base class.
5. **Avoid targeting children**: Do not target children classnames directly in CSS. Prefer passing a `className` prop to the child component.
6. **Use `classNames` for all conditional classnames**: Compose conditional classnames with the `classNames` utility. Do not use array joins or string interpolation for conditional class logic.
7. **Keep `className` expressions simple and explicit**: A `className` should be either a string literal for static classes or a `classNames(...)` expression for any dynamic/conditional case.
8. **Refactor on touch**: When modifying a component for any reason, normalize existing classname composition to these rules instead of preserving non-standard patterns.
9. **Improve readability when multiline**: If a `classNames` call spans multiple lines (e.g., long arguments or conditional object syntax), assign it to a variable before `return` to keep JSX readable.

## Example

```tsx
import classNames from 'classnames';
import styles from './MyComponent.module.css';

export function MyComponent({ isActive, className }) {
  const headerClassName = classNames(styles.header, {
    [styles.headerActive]: isActive
  });

  return (
    <div className={classNames(styles.myComponent, className)}>
      <div className={headerClassName}>
        Header
      </div>
    </div>
  );
}
```
```css
.myComponent {
  /* styles */
}

.header {
  /* styles */
}

.headerActive {
  /* styles */
}
```
