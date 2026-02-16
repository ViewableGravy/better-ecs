# coding standards

- Always prefer guard clauses over nested/else statements.
- Always ensure strict type safety.
  - Never use `any`, `as` casts, or non-null assertions (`!`) unless there is no viable alternative.
  - If you must use one, add a short comment explaining why it is required and why refactoring is not practical.
- Always use `src` as the source directory for all packages and applications, never `lib` or `dist`.
- When implementing an interface with a single unused argument, omit the argument entirely.
  - In cases where there are multiple arguments, but only some are used, use `_`, `__`, etc. naming convention to indicate unused arguments.
- Keep public APIs (functions, properties, classes) minimal.
  - Avoid exposing extra userland surface area.
  - Prefer composable exports over large all-in-one objects.
  - Reduce IntelliSense noise by splitting internal details from user-facing types where useful.
- Always remove files when all exports are removed from the file.
  - Do not leave empty files or `export {}` if the file is no longer used.
- Do not create unused functions/helpers. Design for current requirements and add new helpers only when needed.

# performance

- Avoid unnecessary temporary allocations.
  - Since this application is real time, 60+ fps, GC pressure causes frame drops.
  - In hot paths (main loop/per-frame/inner loops), avoid avoidable object/array allocations.
  - Prefer pooling, mutation, and reference reuse where appropriate.
  - Prefer slightly more computation to avoid allocations.
  - Use judgment: necessary small allocations are acceptable; avoid obvious GC-heavy patterns.

# tooling

- Assume the dev server is already running on port 3000. Only start it if it is not running.
- Always use tools to assert types/lint/tests (never assume they work).
- Always use `bun` for the following tasks:
  - Running tests (unless vitest config exists).
  - Running scripts.
  - Installing packages.
- Always use `nx` for the following tasks:
  - Bootstrapping new packages.

# guidelines + mindset

- Assume that the codebase and packages are configured correctly to reference each other, unless specifically told otherwise.
- If a package/type cannot be found, do not jump to broad config edits. First consider safer fixes such as:
  - Correcting imports.
  - Linking or installing missing workspace dependencies.
  - Verifying existing package exports before changing build/tooling config.

# Documentation

If solving a problem required investigation, trial/error, or non-obvious steps, consider creating an [agent skill](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) so future agents can reuse it.

- If the skill includes CLI usage, add a `scripts` folder inside the skill and place Node/Bun scripts there.
- Reference scripts using markdown relative links: \[name\]\(./scripts/...\).
- If response structure matters, add a `template.md` and link it.
- For broad workflows (for example, workspace checks), prefer multiple small scripts linked from the skill. This keeps agent context focused and reduces prompt bloat.
