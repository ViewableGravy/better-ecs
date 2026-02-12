# AGENTS.md

## Project overview

Better ECS is a type safe ecs game engine with built in features for handling game loops and rendering. this monorepo contains two main directories

- **apps**: "userland" applications that consume the engine
- **packages**: code for shared engine related code such as the core, plugins, adapters, etc.

## Setup commands

- Install deps: `bun install`
- Build packages: `bun run build` (affected) or `bun build:all` (force all)
- Start dev server: `bun dev`
- Run tests: `bun test`

## Code style

- TypeScript strict mode with extensive type safety
- Framework-agnostic core logic separated from bindings and plugins
- Use workspace protocol for internal dependencies (`workspace:*`)
- do not write to /tmp or similar root level directories, ensure all files that are created are created inside the repository unless otherwise stated or confirmed.

## No Legacy Code Policy

**Critical**: This project does not maintain legacy code or deprecated APIs.

- **Remove, don't deprecate**: When refactoring, completely remove old implementations rather than marking them as deprecated.
- **No backward compatibility layers**: Do not add compatibility shims for old APIs.
- **Clean codebase**: Actively remove unused code, dead imports, and obsolete patterns.
- **Modern only**: Use the latest patterns and APIs. This is a personal project building foundational architecture.
- **Refactors are full replacements**: When implementing new architecture, update all consuming code to use it immediately.

This ensures the codebase stays clean, maintainable, and doesn't accumulate technical debt.

## Dev environment tips

- This is a bun workspace monorepo with packages organized by functionality.
- Nx provides caching, affected testing, targeting, and parallel execution for efficiency.
- Use `npx nx show projects` to list all available packages (engine, plugins, client, server).
- Target specific packages: `npx nx run engine:test` or `bun run test --projects=engine`.
- Run affected tests only: `npx nx affected --target=test`.
- **Granular Vitest testing within packages:**
  - Navigate first: `cd packages/engine`
  - Specific files: `bun x vitest run src/ecs/world.spec.ts`
  - Test patterns: `bun x vitest run src/ecs/world.spec.ts -t "query"`
  - List tests: `bun x vitest list`
- **Available targets per package:** `build`, `test`, `lint`, `typecheck`, `dev` (apps).
- **Testing strategy:** Package level (nx) → File level (vitest) → Test level (-t flag).

## Testing instructions

- **Critical**: Always run tests and typechecks during development - do not proceed if they fail.
- **Test targets:** `bun run test`, `bun run lint`, `nx run-many --target=typecheck`.
- **Full CI suite:** `bun run build && bun run test`.
- **Efficient targeted testing workflow:**
  1. **Affected only:** `npx nx affected --target=test`
  2. **Specific packages:** `npx nx run engine:test`
  3. **Specific files:** `cd packages/engine && bun x vitest run src/ecs/world.spec.ts`
- **Pro tips:**
  - Use `-t "pattern"` to focus on specific functionality during development.
  - Combine nx package targeting with vitest file targeting for maximum precision.
  - Use `nx run-many --target=test --projects=engine,plugins` to test core changes.

## PR instructions

- Always run `bun run lint` and `bun test` before committing.
- Test changes in relevant apps: `bun dev` to start everything or `nx run client:dev`.
- Update corresponding documentation in `docs/` directory when adding features.
- Add or update tests for any core engine changes in `packages/engine`.
- Use internal workspace protocol for dependencies (`@repo/engine`).

## Package structure

**Apps:**

- `apps/client/` - Frontend application using Vite and the game engine.
- `apps/server/` - Node.js server for multiplayer/persistence (if applicable).

**Core Packages:**

- `packages/engine/` - Core ECS engine logic (World, Entity, Storage, Systems).
- `packages/plugins/` - Shared engine plugins (e.g., FPS counter).

**Dependencies**: Uses workspace protocol (`workspace:*`) - engine → plugins → apps.

## Common development tasks

**Creating a System:**

- Use `createSystem("name")({ ... })` from `@repo/engine/core`.
- Define a schema for system state using Zod or Standard Schema.
- Implement the `system` function for per-tick logic and `initialize` for setup.

**Working with the World:**

- Use `useWorld()` inside a system to get the `UserWorld` instance.
- Create entities: `const id = world.create()`.
- Add components: `world.add(id, ComponentClass, { ... })`.
- Query entities: `const entities = world.query(ComponentA, ComponentB)`.

**Engine initialization:**

- Define an initialization system to set up the starting world state.
- Use `createEngine({ initialization, systems })` to construct the engine instance.
- Entry point: `const engine = createEngine({ ... })`.

**Running the game loop:**

- Use the async generator `engine.startEngine({ fps, ups })`.
- Handle `update.shouldUpdate` for game logic and `frame.shouldUpdate` for rendering.

**Documentation updates:**

- Update relevant docs in `docs/` directory.
- Maintain `conveyor-system-design.md` for major architectural changes.

## Framework-specific notes

**Client:**

- Main entry point: `apps/client/src/main.ts`.
- Uses Vite for development and bundling.
- Implements render systems (e.g., `systems/render/index.ts`).
- Uses `@repo/plugins` for shared utilities like FPS counters.

**Server:**

- Node.js application in `apps/server/src/main.ts`.
- Headless execution using the same `@repo/engine` core.
- (Planned) Authoritative state management and persistence.

## Environment requirements

- **Bun** - Recommended runtime and package manager.
- **Node.js** - Supported for server-side execution.
- **Nx** - Workspace management and task runner.

## Key architecture patterns

- **Type Safety**: Global `Register` interface for engine-wide type inference.
- **ECS**: Entity-Component-System pattern with dense storage and efficient queries.
- **System Isolation**: Systems communicate through state schemas and `useSystem`.
- **Phase Separation**: Explicit "update" (logic) and "render" (interpolation) phases.

## Monorepo tooling conventions

- **Vite source references**: Package imports resolved via Vite should point to `src/` (not `dist/`) to enable hot reloading during development. Path aliases in `tsconfig.json` map `@repo/<pkg>` to the source entry points.
- **TypeScript project references**: TypeScript `references` in `tsconfig.json` files are managed by Nx's sync generator (`nx sync`). Do not manually add or remove `references` entries.
- **Module declaration for type registration**: Apps use `declare module "@repo/engine"` to augment the `Register` interface with the concrete engine type (e.g., `Engine: Awaited<ReturnType<typeof main>>`). This is similar to how TanStack Router uses module declaration for route-level type safety. This pattern is intentional and should be preserved.

## Development workflow

1. **Setup**: `bun install`.
2. **Build**: `bun run build`.
3. **Explore**: `npx nx show projects`.
4. **Develop**: `bun dev` to start individual packages or the whole workspace.
5. **Test**: `bun test` and `nx run-many --target=typecheck`.

## References

- **Core Engine**: `packages/engine/`
- **Design Docs**: `docs/conveyor-system-design.md`
- **Optimization Strategy**: `docs/OPTIMIZATIONS.md`

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
