- Assume the dev server is always running on port 3000 (only if it is not do you then attempt to start it)
- Always use tools to assert types/lint/tests (never assume they work)
- Always prefer guard clauses over nested/else statements
- Always use `bun` for the following tasks:
  - Running tests (unless vitest config exists)
  - Running scripts
  - Installing Packages
- Always use `nx` for the following tasks:
  - Bootstrapping new packages
- Always ensure strict type safety
  - Never use `any`, `as` casts, or non-null assertions (`!`) unless it is the final
    option. In such case, leave a comment explaining, confirm this is the only option,
    and ensure there is no other refactor or architecture change that can be made to avoid it.
- Always use `src` as the source directory for all packages and applications, never `lib` or `dist`
- Assume that the codebase and packages are configured correctly to reference eachother,
  unless specifically told otherwise. If you encounter a package/type that cannot be found, consider alternatives to sweeping vite/tsconfig/package.json changes that assume misconfiguration, such as:
  - Adding new path aliases
  - Adding new exports to packages
  - Modifying tsconfig paths or rootDirs
- When conforming to function interfaces that expect a single argument, but the argument in the implementation is unused, do not create the argument (as it will still conform to the interface if the arg is not present). In cases where there are multiple arguments, but only some are used, use `_`, `__`, etc. naming convention to indicate unused arguments.
- Public API (public functions, properties, classes, etc.) should have a minimal API surface.
  - Avoid excessive userland properties, functions, etc.
  - Aim for the minimal necessary API to reduce userland complexity.
  - Use the following techniques to reduce intellisense clutter
    - Make functionality composable, allowing the user to import their desired functionality, rather than offering dozens of properties
    - Consider breaking up internal functionality into separate properties
      for a smaller intellisense footprint per object level
    - Consider Internal / User types for the same object, where types are casted to userland types with a smaller surface, while internal types have a larger surface with more properties for internal use.
