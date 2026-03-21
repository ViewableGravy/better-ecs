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
- Before creating any new helper/function, always search for an existing implementation and reuse/extend it when viable.
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
- Prefer lines around 115 characters when readability stays good; do not wrap shorter lines just to satisfy a narrower limit.
- Always ensure strict type safety.
  - Never use `any`, `as` casts, or non-null assertions (`!`) unless there is no viable alternative.
  - If unavoidable, include a short comment explaining why in code.
- Always use `src` as the source directory for apps/packages (never `lib` or `dist`).
- When implementing an interface with a single unused argument, omit the argument entirely.
  - If there are multiple args and some are unused, use `_`, `__`, etc.
- Keep public APIs minimal and composable.
- Remove files when all exports are removed (no empty placeholders).
- Do not create unused helpers/functions.
- Keep one class/component per file.
  - If related classes/components must live together conceptually, create a folder named after the feature and split into focused files (for example `input/index.ts` + `input/mouse.ts`).
- Prefer concrete named types over indirect `typeof`/`ReturnType<typeof ...>` extraction when a stable, importable type already exists.
  - Example: prefer `Engine` over `ReturnType<typeof makeEngine>[0]`.
  - Use `typeof`/`ReturnType` only when a concrete type is not reasonably importable (for example complex inferred unions/intersections).

## Comment preservation

- Do not remove existing code comments unless they are explicitly wrong or stale.
- If a comment seems unnecessary but is not clearly wrong, ask before removing it.
- Add comments for public-facing functions and where clarification would help someone with less context understand the code.

## Architecture principles

- Prefer **colocation over hoisting** by default.
  - Keep behavior next to the feature/factory that owns it (scene behavior in scenes, asset behavior in asset loaders, runtime behavior in systems/plugins).
  - Hoist to engine-level/global scope only when truly cross-cutting and shared across most scenes/features.
- For React/userland adapters, prefer moving state and orchestration downward toward the smallest owning component/module that can safely manage it.
- When introducing new lifecycle hooks/options, start at the lowest meaningful layer and only promote upward if repeated usage demonstrates global ownership.

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
- Always prefer to ask the user any clarifying questions before blatantly doing what is asked. 
  - Use the AskQuestions MCP tool for asking questions
  - If edge cases are found, bring these up and ask clarifying questions
  - Do not "assume" implicit requirements if they are not at least 80% guaranteed
  - If one requirement conflicts with another, or an answer conflicts with an existing requirement, seek confirmation
- Always verify correctness of task with user
  - Once the task feels like it is done, and you would claim finished, ask the user using the AskQuestions tool to verify that everything looks as intended or if further iteration towards the goal is required.

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
- Use `get*` when reading an already-owned value with no meaningful derivation.
  - Example: retrieving active scene context from `engine.scene` should use `getSceneContext`, not `resolveSceneContext`.
- `find*` means search for an existing value by traversing/querying/iterating until the match is identified.
  - Use `find*` when the primary behavior is a search algorithm over existing state.
  - Good fit: walking a belt chain to find its leaf, scanning neighbors to find a matching entity, searching collections/maps/graphs for a specific existing node.
  - `find*` should generally describe “locate something that already exists,” not “derive a transformed result.”
- `require*` means must exist (non-nullable) and throws on absence.
  - Example: `world.require(entityId, Component)`.
- Use `invariant*` when operation semantics need explicit assertion context and `require` is ambiguous.
  - Existing examples: `invariantQuery(...)`, `useInvariantContext(...)`.
  - Preferred when multiple base verbs could apply: `invariantGet`, `invariantQuery`.
- Prefer asserting invariants at API boundaries instead of spreading redundant nullable checks upward.
  - If ids are expected to be valid by contract, assert once (`invariant(...)` or `require*`) and continue with non-nullable flow.
  - Exception: destructive/idempotent methods (for example `destroy`) may return booleans instead of throwing when absence is expected.

### `derive` vs out-parameter naming

- Use `derive*` for deriving a value or decision from current state.
  - For future APIs, prefer `derivePlacementWorld`, `deriveCameraView`, and other `derive*` names over introducing new `resolve*` names.
- Do not use `derive*` when the primary behavior is searching for an already-existing object/node/value.
  - If the function mostly iterates/traverses/queries to locate something, prefer `find*`.
  - Example: a function that walks a belt chain to locate its leaf should prefer `findLeafBelt`, not `deriveLeafBelt`.
- Use `compute*` for derivation that is primarily computation based
  - Good fit today: `computeBeltRailPosition`
- Do not use `derive*` for simple owner reads/getters.
  - If no derivation occurs, use `get*` (or `require*` for non-nullable access).
- Do not use `compute*` for search/traversal either.
  - `compute*` should be reserved for calculated/derived outputs, not for locating existing state.
- Avoid plain `derive*` for APIs whose primary contract is “write into provided object”.

### Practical verb split

- `get*` → direct retrieval through a known path
  - Example: `getSceneContext()`
- `find*` → search existing state to locate something
  - Example: `findLeafBeltEntityId()`
- `derive*` → derive/select/decide a value from current state
  - Example: `derivePlacementWorld()`
- `compute*` → calculate a value from inputs/state
  - Example: `computeBeltRailPosition()`

Rule of thumb:

- If you would describe the implementation as “look through / walk / scan / search until found,” use `find*`.
- If you would describe it as “figure out / decide / map current state into the right output,” use `derive*`.
- If you would describe it as “calculate,” use `compute*`.
- If you would describe it as “read,” use `get*`.

### Utility layering (context vs engine vs bound)

- Prefer a 3-layer utility shape for reusable runtime helpers:
  1. **Context utils** (`@repo/engine/context-utils`) for userland/system calls that read engine from `fromContext(...)`.
  2. **Internal engine-arg utils** (`@repo/engine/internal/utils`) that accept `engine` explicitly and do not read context.
  3. **Bound engine utilities** (`engine.utils`) as thin instance adapters over internal engine-arg utils.
- When adding new helper behavior, implement internal engine-arg utility first, then expose context/bound adapters as needed.
- Context selector factories should use **PascalCase** naming and be consumed via `fromContext(...)`.
  - Example: `fromContext(Engine)` and `fromContext(ActiveCameraView(world, cameraEntityId))`.

For APIs with output destination arguments, standardize on the naming:

- `derive*Into`
  - For future APIs, prefer names like `deriveWorldTransform2DInto(world, entityId, out)`.

Parameter naming for destination values:

- Use `out` for pooled scratch objects/single structured outputs.
- For reusable pooled fields, prefer explicit `SHARED_` naming to signal reuse and mutation.
  - Example: `#SHARED_TRANSFORM2D`.
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
  - `resolveWorldTransform2D(...)` → `deriveWorldTransform2DInto(...)`.

## Documentation / skill capture

If solving a problem required investigation, trial/error, or non-obvious steps, consider adding an agent skill.

- Use the `skills-authoring` skill when authoring skills.
- Skill CLI helpers go in `scripts/` under the skill.
- Link scripts with relative markdown links.
- Add `template.md` when response shape matters.
- Prefer multiple small scripts for broad workflows.

Agressively use the memory tool during development in this project. Memory is the core way that we keep information across sessions and is therefore extremely important. I would like you to put a priority on skill authoring as well. Memory is good for short term, relevant information (and other information) but I would heavily request that you create skills even when it seems trivial. Skills are extremely useful for the developer and for the agent as they give you awesome context around functions, and patterns in the code base. 