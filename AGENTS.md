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
