# Physics Plugin and Portal Collision

## User Request

> 5. Collision on portals
>    It feels to me like it would make sense to add some physics primitives into the engine, and then allow portals to use a generalized physics system (provided by the engine) to perform collision checks. For example, if some of the primitives we discussed were available as a "physics" plugin, then we could access those to hook together. For example, let's say that we make a physics plugin. This might expose
> 1. colliders (rectangle, circle, etc.)
> 1. basic collision system
>
> While the engine might expose
>
> 1. rectangle
> 2. circle
>    etc.
>
> In userland, we can then create a portal entity, and then choose to attach a collider. For example:
>
> ```ts
> const portalId = createPortal(...)
> world.add(portalId, new Collider(...))
> ```
>
> This allows us to more easily compose a hitbox on the portal, regardless of if we are using a custom physics system, or the plugin default.
>
> We would obviously want to make the default physics system plugin composable, but if we wanted, could choose to use a custom implementation entirely by just not adding it (fantastic ECS approach).
>
> When building this plugin, ensure that it is written following best practices, clean and well structured in code (multiple files, functions, etc. with proper isolation and composability).

## Verification (1-3)

The following are already in place:

1. ✅ `ContextEntryRegion` uses `Rectangle` bounds.
2. ✅ `@repo/physics` exists as a separate package and provides colliders (`CircleCollider`, `RectangleCollider`, `CompoundCollider`) and collision APIs.
3. ✅ Scene collision logic is centralized in `SceneCollisionSystem` and uses the physics package (`PhysicsWorld`, `collides`, `resolve`).

## Addressing 4 + 5

### 4) Remove constants-driven scene wiring

- The scene no longer depends on a dedicated `constants.ts` import for context IDs / dimensions.
- Context definitions now receive IDs and bounds as injected options from scene setup.
- This keeps wiring data-driven and allows future runtime/config injection without rewriting systems.

### 5) Portal collisions via physics colliders

- `Portal` remains pure functionality/metadata.
- Portals have **no required default shape or collider**.
- Collision behavior is composed by attaching a physics collider to the same entity (e.g., door entity + `Portal` + `RectangleCollider`).
- Portal activation now uses physics overlap (`collides`) between player collider and portal collider.

## Collision Actions (`resolve` vs custom behavior)

`resolve` is for physical separation (blocking). Custom collision behavior should be modeled as **trigger activation**.

Current pattern:

- use `collides(...)` to detect overlap
- track enter state (`wasInside` → `inside`) to fire only on enter
- invoke custom action (`onEnter`, `onTeleport`, etc.)

This gives ECS composition without forcing all overlaps to be physical blockers.

## Proposed Changes

1. **Create `@repo/plugins/physics`**:
   - **Components**: `Collider`, `Trigger`.
   - **Systems**: `PhysicsSystem` (resolves collisions), `TriggerSystem` (detects overlaps without resolving position).
2. **Move Primitives to Engine**: Move `Rectangle`, `Circle` math classes to `packages/engine/src/math`.
3. **Composable Design**: Portals will have a `Transform2D`, `ContextEntryRegion` (metadata), and a `Collider` (shape).
4. **Collision vs Trigger**: Differentiate between "Physical Colliders" (which block movement) and "Triggers" (which just report an overlapping event). Portals would likely be Triggers.

> Note: In current implementation, trigger semantics are achieved by `collides` + enter-state tracking. A dedicated `Trigger` component/system can still be added later for a generalized event stream (`enter/stay/exit`) across all gameplay features.

## Benefits

- **Composition**: Portals aren't forced to be one shape; they can be circles or rectangles.
- **De-duplication**: The same intersection logic used for physics can be used for portals.
- **Modularity**: Users can swap out the default physics plugin for a more complex one (like Box2D or Matter.js) by mapping the same `Collider` components.
