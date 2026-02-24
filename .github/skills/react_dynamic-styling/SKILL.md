---
name: react_dynamic-styling
description: Standardized process for working with dynamic styling in react, specifically how to pass react variables to css and use them inside css files.
---

# React Dynamic Styling

## Purpose
Standardize how dynamic React variables are passed to CSS to ensure flexibility, maintainability, and type safety.

## When to Use
- Applying dynamic styles based on React state or props.
- Using the `style` prop on an element or component.

## Rules & Best Practices

### 1. Use CSS Variables Instead of Inline Styles
Pass dynamic values as CSS variables rather than applying CSS properties directly. This keeps styling logic in CSS and allows for easy overrides.

**❌ Bad:**
```tsx
<div style={{ color: someValue }}>...</div>
```

**✅ Good:**
Use the `createStyles` helper to avoid TypeScript errors when passing custom CSS variables:
```tsx
const dynamicStyles = createStyles({
  "--my-component-color": someValue
});

<div style={dynamicStyles} className="my-class">...</div>
```

### 2. Pass Raw Values, Compute in CSS
Pass the minimum raw value to CSS and perform calculations (like `calc()`) inside the stylesheet.

**❌ Bad:**
```tsx
createStyles({ "--my-component-width": `calc(100% - ${width}px)` })
```

**✅ Good:**
```tsx
createStyles({ "--my-component-width": `${width}px` })
```
```css
.my-class {
  width: calc(100% - var(--my-component-width));
}
```

### 3. Scope CSS Variables
Prefix CSS variables with the component name to prevent global naming collisions.

**❌ Bad:** `--width`
**✅ Good:** `--my-component-width`

### 4. Define Default Values in CSS
Always define a default value for the CSS variable in the stylesheet rather than relying on `var(--var-name, fallback)` everywhere it's used.

**✅ Good:**
```css
.my-class {
  /* Default fallback */
  --my-component-color: #000; 
  color: var(--my-component-color);
}
```
