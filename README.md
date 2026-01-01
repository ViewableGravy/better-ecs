# Better ECS Game Engine

A client-first ECS-based game engine using TypeScript, Vite, and Nx monorepo.

## Architecture

This project follows a strict Entity-Component-System architecture:

- **Entities**: Opaque IDs only (using type-fest tagged types)
- **Components**: Pure data, no logic
- **Systems**: Operate over component sets, no direct system-to-system calls
- **Feature-oriented structure**: Not "components vs systems"
- **Client-first**: Browser-based runtime with Vite
- **Multiplayer-ready**: Networking layer to be added later
- **Schema-first serialization**: Supports JSON (authoring) and binary (runtime)

## Project Structure

```
/better-ecs
  /apps
    /client        # Browser game (Vite)
    /server        # Placeholder for future backend
  /packages
    /engine        # ECS, math, serialization, runtime
    /shared        # Shared utilities/types
  nx.json
  package.json
  tsconfig.base.json
```

## Engine Package Structure

```
/packages/engine/src
  /ecs
    entity.ts      # Entity type & factory
    world.ts       # World container
    storage.ts     # Component storage
  /math
    index.ts       # Math utilities (to be implemented)
  /serialization
    schema.ts      # Component schema interface
    json.ts        # JSON serialization (to be implemented)
    binary.ts      # Binary serialization (to be implemented)
    index.ts
  /core
    game.ts        # Game initialization
    time.ts        # Time management (to be implemented)
  index.ts
```

## Setup

Install dependencies:

```bash
npm install
```

## Development

Run the client:

```bash
npm run dev
```

Or run specific app:

```bash
npx nx dev client
```

## Design Principles

1. **Entities are IDs only** - No classes, no methods
2. **Components are pure data** - No behavior, no cross-references
3. **Systems do not call each other** - Communication via shared data
4. **Serialization is schema-driven** - Not raw JS objects
5. **Rendering is policy-driven** - Draw order is a rendering decision
6. **Multiplayer is layered later** - Architecture stays clean
7. **Structure precedes implementation** - This is bootstrap phase only

## Current Status: Bootstrap Phase

This is **structure only**. The following are NOT implemented yet:

- ❌ Rendering systems
- ❌ Gameplay systems
- ❌ Components (Transform, Renderable, etc.)
- ❌ Serialization logic
- ❌ Networking
- ❌ Editors
- ❌ Game loop logic

## Next Steps

After bootstrap:
1. Implement core game loop
2. Add basic component types (Transform, etc.)
3. Create render system
4. Add serialization implementation
5. Build gameplay systems
6. Add networking layer
