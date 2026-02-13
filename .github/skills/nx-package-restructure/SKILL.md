---
name: nx-package-restructure
description: "Restructure Better ECS packages into grouped folders (foundation/features/tooling) while keeping Nx, TypeScript references, and workspace linking valid. USE WHEN moving package directories, splitting a package into multiple packages, or renaming package locations in this monorepo."
---

# Nx Package Restructure (Better ECS)

Use this workflow when reorganizing packages (for example from flat `packages/*` to grouped folders like `packages/foundation/*`, `packages/features/*`, and `packages/tooling/*`).

## Goals

1. Preserve package APIs (or intentionally migrate imports in one pass).
2. Keep Nx project graph valid.
3. Keep TypeScript project references valid.
4. Keep workspace package linking valid.

## Migration Checklist

### 1) Plan package boundaries first

Define package roles before moving files:

- `packages/engine/*` for core engine runtime
- `packages/foundation/*` for architectural runtime foundations
- `packages/features/*` for optional systems/features
- `packages/tooling/*` for build/dev tooling

Prefer dedicated packages over umbrella exports once domains diverge.

### 2) Move package folders and split source

- Move folder locations.
- If splitting one package into many, copy source into the new package roots and create package-local `src/index.ts` entrypoints.
- Remove obsolete package folders when complete (no compatibility layers).

### 3) Update workspace package discovery

Edit root `package.json` `workspaces` to include grouped paths:

```json
{
  "workspaces": ["apps/*", "packages/*", "packages/*/*"]
}
```

### 4) Create/Update package configs per moved package

For each moved package:

- `package.json`
- `project.json`
- `tsconfig.json`
- `tsconfig.lib.json`
- optional `vitest.config.ts`

Critical path updates when moving to nested folders:

- `$schema` path in `project.json`
- `sourceRoot`
- `targets.*.options.cwd`
- `extends` path in tsconfig files
- any tsconfig `paths`/`references`

### 5) Update all consumers

Replace imports and aliases in apps/packages:

- source imports (e.g. `@repo/plugins` -> `@repo/spatial-contexts`, `@repo/physics`, `@repo/fps`)
- Vite aliases in app config
- TS `compilerOptions.paths`
- app/package dependencies

### 6) Relink workspaces

Run install from repo root to refresh symlinks:

```bash
bun install
```

### 7) Sync TS references via Nx

```bash
bunx nx sync
```

This updates root/app `tsconfig.json` references using Nx sync generators.

### 8) Validate the migration

Run checks through Nx:

```bash
bunx nx run-many --target=typecheck
bunx nx run-many --target=test
```

If this is too broad during iteration, run targeted checks first, then full checks before finishing.

## Common Failure Modes

- **`Cannot find module @repo/...` in Vite config**
  - Run `bun install` after moving workspace package folders.
- **`Referenced project must have composite: true`**
  - Fix moved package tsconfig `extends` path so `tsconfig.lib.json` is loaded correctly.
- **Nx graph processing fails**
  - Verify moved `project.json` has correct `$schema`, `sourceRoot`, and target `cwd` paths.

## Better ECS Conventions

- Use Bun commands (`bun`, `bunx`) for install/test/scripts.
- Use Nx task execution (`nx run`, `nx run-many`, `nx affected`).
- Keep package source in `src`.
- Prefer clean replacements over compatibility layers.
