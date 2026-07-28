---
name: ecs-component-mutators
description: Keep components as pure state and centralize reusable component update logic in mutator classes for declarative, allocation-light systems.
---

# ECS Component + Mutator Pattern

## Purpose

Use mutators to apply shared logic to component state while keeping components data-only.

## When to use

- You have repeated logic for updating a specific component type in multiple systems.
- You want component changes to stay consistent without copying rules across files.
- You want reusable behavior without allocating helpers inside hot loops.

## Commands

Run:

- [validate.ts](./scripts/validate.ts)

Examples:

- `bun .github/skills/ecs-component-mutators/scripts/validate.ts`

## Behavior

1. Keep components as plain state containers (fields only).
2. Implement component behavior in a mutator that binds to one component instance at a time.
3. Reuse a module-scoped mutator in systems and call `set(...)` before each operation.

## Core pattern

### Component (state only)

```ts
export class Cooldown {
  constructor(
    public remainingMs = 0,
    public durationMs = 250,
    public active = false,
  ) {}
}
```

### Mutator (behavior)

```ts
export class CooldownMutator {
  private cooldown: Cooldown | null = null;

  set(cooldown: Cooldown): this {
    this.cooldown = cooldown;
    return this;
  }

  start(durationMs = this.requireCooldown().durationMs): void {
    const c = this.requireCooldown();
    c.durationMs = durationMs;
    c.remainingMs = durationMs;
    c.active = true;
  }

  tick(deltaMs: number): void {
    const c = this.requireCooldown();
    if (!c.active) return;

    c.remainingMs = Math.max(0, c.remainingMs - deltaMs);
    c.active = c.remainingMs > 0;
  }

  get ready(): boolean {
    return !this.requireCooldown().active;
  }

  private requireCooldown(): Cooldown {
    if (!this.cooldown) throw new Error("Call set() before mutator use");
    return this.cooldown;
  }
}
```

### System usage

```ts
const cooldownMutator = new CooldownMutator();

for (const entityId of world.query(Cooldown)) {
  const cooldown = world.get(entityId, Cooldown);
  if (!cooldown) continue;

  cooldownMutator.set(cooldown);
  cooldownMutator.tick(updateDelta);
}
```

## Design notes

- `unset()` can exist for defensive use, but is not required in hot paths if `set(...)` is always called before reads/writes.
- Keep mutators stateless beyond their current component reference.
- Prefer module-scoped mutator instances for zero churn.
- Use one mutator per component domain (for example cooldown, health, movement params).