---
name: css_classname-naming-old
description: Guidelines for naming CSS classnames using BEM methodology in React components.
---

# CSS Classname Naming

## Purpose

To ensure consistent, predictable, and maintainable CSS classnames across the codebase using the BEM (Block Element Modifier) methodology.

## When to use

- When creating new React components that require styling.
- When refactoring existing components to use standard CSS classnames.
- When adding conditional styles or modifiers to elements.

## Behavior

1. **Use BEM naming**: Follow the `Block__Element--Modifier` pattern (e.g., `MyComponent__component--modifier`).
2. **Capitalize the classname**: The block name should match the React component name exactly (e.g., `MyComponent`).
3. **Match the React component name**: When defining a class for the root element of a component, use the component's name.
4. **Use nested CSS**: Build classnames using nested CSS (e.g., `&__element` and `&--modifier`).
5. **Modifiers are for conditionals**: Only use modifiers for boolean or conditional classnames.
6. **Root element naming**: Only the outermost React element should use the block name directly (`MyComponent`). All nested elements should use a sub-name (`MyComponent__element`) or a modifier.
7. **Avoid targeting children**: Do not target children classnames directly in CSS. Prefer passing a `className` prop to the child component.
8. **Use `classNames` utility**: Use the `classNames` utility function for composing conditional classnames in React. If the `classNames` call must be formatted over multiple lines (e.g., due to line length or containing an object for conditional classes), assign it to a variable before the JSX return statement to prevent conflating the markup.

## Example

```tsx
import classNames from 'classnames';
import styles from './MyComponent.module.scss';

export function MyComponent({ isActive, className }) {
  const headerClassName = classNames(styles.MyComponent__header, {
    [styles['MyComponent__header--active']]: isActive
  });

  return (
    <div className={classNames(styles.MyComponent, className)}>
      <div className={headerClassName}>
        Header
      </div>
    </div>
  );
}
```
