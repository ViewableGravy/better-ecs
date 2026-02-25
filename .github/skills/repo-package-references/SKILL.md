---
name: repo-package-references
description: Configure an app/package to reference another workspace package correctly in Better ECS, including workspace dependencies, Nx/TypeScript references, Vite resolution, and verification.
---

# Repo Package References

## Purpose

Use this skill to correctly wire `@repo/...` imports between projects in this monorepo without brittle local path imports.

## When to use

- A project needs to import a sibling workspace package via `@repo/...`.
- You see module resolution errors (`TS2307`, `Cannot find module`, Vite failed to resolve).
- You created/moved packages and need to sync references and verify through Nx.

## Workflow

1. Add workspace dependency in consumer `package.json`.
2. Ensure root TypeScript path alias exists in `tsconfig.base.json`.
3. Sync Nx TypeScript references.
4. Ensure Vite resolves TS paths.
5. Run Nx verification (`typecheck`, then `dev`/`build` as needed).

## Steps

### 1) Add workspace dependency (consumer package)

In the consumer project `package.json`:

```json
{
  "dependencies": {
    "@repo/<provider>": "workspace:*"
  }
}
```

Then install from workspace root:

```bash
bun install
```

### 2) Add/verify root TS path alias

In `tsconfig.base.json` under `compilerOptions.paths`, map package name to source entry:

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@repo/<provider>": ["./packages/<group>/<provider>/src/index.ts"]
    }
  }
}
```

Notes:

- Use `./`-prefixed relative paths.
- Point to `src/` entry (not `dist/`) for dev-time HMR/type navigation.

### 3) Sync project references with Nx

Do not hand-maintain TypeScript references when Nx manages them.

```bash
bun x nx sync
```

### 4) Ensure Vite resolves TS path aliases

In app Vite config, add TS paths plugin:

```ts
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
});
```

Install it in the consumer if missing:

```bash
cd apps/<consumer> && bun add -d vite-tsconfig-paths
```

### 5) Verify resolution and types

From workspace root:

```bash
bun x nx run <consumer>:typecheck --outputStyle=static
bun x nx run-many --target=typecheck --all --outputStyle=static
bun dev
```

## Troubleshooting

- **Import works in TS but not Vite**: ensure `vite-tsconfig-paths` is enabled in the app `vite.config.*`.
- **Nx says workspace out of sync**: run `bun x nx sync` and keep generated reference updates.
- **ESM import errors inside package source**: use extension-safe specifiers for emitted JS (for example `./module.js` in TS source for ESM packages).
- **Avoid** direct cross-package relative imports like `../../packages/...` from app code/config when `@repo/...` can be used.
