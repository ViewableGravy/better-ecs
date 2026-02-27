# AGENT.md

## Purpose

This is the single source of truth for agent behavior and coding conventions in this workspace.

## Workspace map (high-level)

- `apps/` → runnable applications (userland consumers of workspace packages).
- `packages/` → shared engine/runtime/tooling packages.
- `docs/` → architecture, implementation notes, and design decisions.
- `.github/` → agent automation assets (skills, prompts, instructions scaffolding).
- Root config (`nx.json`, `tsconfig*.json`, `vitest.workspace.ts`, `eslint.config.mjs`) governs workspace-wide behavior.

## Discovering package relationships

- List all projects: `bun x nx show projects`.
- Inspect a project: `bun x nx show project <projectName>`.
- Visualize dependencies: `bun x nx graph`.
- Print graph JSON for scripting/inspection: `bun x nx graph --print`.
- Understand TS project-level linkage: read root `tsconfig.json` `references` (managed by `nx sync`).

## Finding code quickly

- Prefer targeted search over broad config edits.
- Use symbol/text search first, then follow usages.
- Good first patterns:
  - API names (`requireWorld`, `invariantQuery`, `resolveWorldTransform2D`)
  - System definitions (`createSystem("...")`)
  - Class suffixes (`Manager`, `Mutator`)

## Import and alias conventions

### Workspace aliases (`tsconfig.base.json`)

- `@repo/client` → `apps/client/src/main.ts`
- `@repo/server` → `apps/server/src/main.ts`
- `@repo/engine` → `packages/engine/src/index.ts`
- `@repo/fps` → `packages/features/fps/src/index.ts`
- `@repo/hmr` → `packages/tooling/hmr/src/index.ts`
- `@repo/physics` → `packages/foundation/physics/src/index.ts`
- `@repo/spatial-contexts` → `packages/foundation/spatial-contexts/src/index.ts`
- `@repo/utils` → `packages/utils/src/index.ts`

### App/package-local aliases

- Client app TS alias: `@/*` → `apps/client/src/*`.
- Engine package Vite aliases:
  - `@ui` → `packages/engine/src/ui`
  - `@/<path>` rewritten to `@repo/engine/<path>` in engine library build.

## Core coding standards

- Always prefer guard clauses over nested/else statements.
- Always ensure strict type safety.
  - Never use `any`, `as` casts, or non-null assertions (`!`) unless there is no viable alternative.
  - If unavoidable, include a short comment explaining why in code.
- Always use `src` as the source directory for apps/packages (never `lib` or `dist`).
- When implementing an interface with a single unused argument, omit the argument entirely.
  - If there are multiple args and some are unused, use `_`, `__`, etc.
- Keep public APIs minimal and composable.
- Remove files when all exports are removed (no empty placeholders).
- Do not create unused helpers/functions.

## Performance guidance

- Avoid unnecessary allocations in hot paths (main loop / per-frame / inner loops).
- Prefer pooling, mutation, and reference reuse where appropriate.
- Favor stable frame pacing over convenience allocations.

## Tooling and execution rules

- Assume dev server is already running on port `3000`; only start it if needed.
- Always verify with tools (types/lint/tests), never assume correctness.
- Use `bun` for installs, scripts, and tests (unless package-local vitest workflow is required).
- Use `nx` for task orchestration and package bootstrapping.
- Do not write files outside this repository.

## No legacy code policy

- Remove old implementations instead of deprecating.
- Do not add backward compatibility shims.
- Remove dead code, dead imports, and obsolete patterns promptly.

## Development workflow

1. Install: `bun install`
2. Explore: `bun x nx show projects`
3. Build: `bun run build` (or targeted `bun x nx run <project>:build`)
4. Verify: `bun run lint`, `bun test`, `bun x nx run-many --target=typecheck`

## Naming conventions (initial)

This section is intentionally explicit to reduce drift.

### Retrieval and invariants

- `get*` means nullable/optional retrieval.
  - Example: `world.get(entityId, Component)` returns `T | undefined`.
- `require*` means must exist (non-nullable) and throws on absence.
  - Example: `world.require(entityId, Component)`.
- Use `invariant*` when operation semantics need explicit assertion context and `require` is ambiguous.
  - Existing examples: `invariantQuery(...)`, `useInvariantContext(...)`.
  - Preferred when multiple base verbs could apply: `invariantGet`, `invariantQuery`.

### `resolve` vs out-parameter naming

- Use `resolve*` for computing/deriving a value or decision from current state.
  - Good fit today: `resolvePlacementWorld`, `resolveCameraView`, collision `resolve*` functions.
- Avoid plain `resolve*` for APIs whose primary contract is “write into provided object”.

For APIs with output destination arguments, standardize on the naming:

- `resolve*Into`
  - Example: `resolveWorldTransform2DInto(world, entityId, out)`

Parameter naming for destination values:

- Use `out` for pooled scratch objects/single structured outputs.
- Use `target` for mutating an existing collection or external receiver.
- Keep destination parameter last.

### Class and API shape naming

- `*Manager` for lifecycle/state coordinators (e.g., `SceneManager`, `RenderManager`, `SpatialContextManager`).
- `*Mutator` for focused state transition logic on existing entities/components.
- Hooks use `use*` prefix (`useContextWorld`, `useInvariantContext`).
- System factories use `createSystem("namespace:name")` with explicit namespace prefixes (`engine:`, `main:`, `plugin:`, `temp:`).

### Migration guidance for current inconsistencies

- Keep existing `require` semantics as-is.
- Keep `invariantQuery` and `useInvariantContext` naming model.
- For future out-parameter APIs, prefer `write*` + trailing `out`.
- Candidate rename to align semantics in the future:
  - `resolveWorldTransform2D(...)` → `resolveWorldTransform2DInto(...)`.

## Documentation / skill capture

If solving a problem required investigation, trial/error, or non-obvious steps, consider adding an agent skill.

- Use the `skills-authoring` skill when authoring skills.
- Skill CLI helpers go in `scripts/` under the skill.
- Link scripts with relative markdown links.
- Add `template.md` when response shape matters.
- Prefer multiple small scripts for broad workflows.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->