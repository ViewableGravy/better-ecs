---
name: css_classname-naming
description: Guidelines for naming CSS classnames using CSS Modules in React components.
---

# CSS Classname Naming (CSS Modules)

## Purpose

To ensure consistent, predictable, and maintainable CSS classnames across the codebase using CSS Modules. Since CSS Modules automatically scope styles locally, we avoid complex naming conventions like BEM in favor of simple, descriptive camelCase names.

## When to use

- When creating new React components that require styling.
- When refactoring existing components to use standard CSS classnames.
- When adding conditional styles or modifiers to elements.

## Behavior

1. **Use camelCase**: Always prefer `camelCase` for class names so they can be accessed via dot notation (e.g., `styles.myClass`). Do not use kebab-case (e.g., `my-class`).
2. **No BEM required**: Because CSS modules provide isolation, BEM naming (`__` and `--`) is unnecessary. Use simple, descriptive names (e.g., `header`, `submitButton`).
3. **Root element naming**: The root element of a component should match the component's name but in `camelCase` (e.g., `myComponent` for `<MyComponent />`), or simply use `root`.
4. **Modifiers are for conditionals**: Use descriptive camelCase names for conditional states (e.g., `isActive`, `isDisabled`, `hasError`). Apply them alongside the base class.
5. **Avoid targeting children**: Do not target children classnames directly in CSS. Prefer passing a `className` prop to the child component.
6. **Use `classNames` utility**: Use the `classNames` utility function for composing conditional classnames in React. If the `classNames` call must be formatted over multiple lines (e.g., due to line length or containing an object for conditional classes), assign it to a variable before the JSX return statement to prevent conflating the markup.

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
