# Better ECS

A browser-first TypeScript game and ECS engine built with Vite and Nx.

The current scope is intentionally single-player. The repository has no server, networking,
replication, or generic ECS serialization layer. Persistence and multiplayer will be designed from
the needs of a working deterministic simulation rather than carried as speculative engine plumbing.

## Project structure

```text
src/
  app/client/          Browser game
  engine/              ECS, scenes, rendering, input, editor
  libs/commands/       Simulation commands
  libs/fps/            FPS display
  libs/physics/        Physics and collision
  utils/               Shared utilities
```

## Setup

Install dependencies:

```bash
bun install
```

## Development

Run the client:

```bash
bun dev
```

## Design Principles

1. Entities are opaque, scene-scoped, monotonic IDs.
2. Components contain data; feature-owned behavior stays near the owning feature.
3. Systems operate over component queries and explicit commands.
4. Hot paths avoid unnecessary allocation and per-field tracking.
5. Impossible states should assert at ownership boundaries instead of creating nullable plumbing.

See [docs/README.md](docs/README.md) for active plans and architecture references.
