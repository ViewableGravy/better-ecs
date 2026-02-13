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

## Current Implementation

Currently, `ContextEntryRegion` (portals) is handled separately from `CircleCollider` (physical obstacles). Portals are checked in a transition system, while obstacles are handled in `SceneCollisionSystem`.

## Proposed Changes

1. **Create `@repo/plugins/physics`**:
   - **Components**: `Collider`, `Trigger`.
   - **Systems**: `PhysicsSystem` (resolves collisions), `TriggerSystem` (detects overlaps without resolving position).
2. **Move Primitives to Engine**: Move `Rectangle`, `Circle` math classes to `packages/engine/src/math`.
3. **Composable Design**: Portals will have a `Transform2D`, `ContextEntryRegion` (metadata), and a `Collider` (shape).
4. **Collision vs Trigger**: Differentiate between "Physical Colliders" (which block movement) and "Triggers" (which just report an overlapping event). Portals would likely be Triggers.

## Benefits

- **Composition**: Portals aren't forced to be one shape; they can be circles or rectangles.
- **De-duplication**: The same intersection logic used for physics can be used for portals.
- **Modularity**: Users can swap out the default physics plugin for a more complex one (like Box2D or Matter.js) by mapping the same `Collider` components.
