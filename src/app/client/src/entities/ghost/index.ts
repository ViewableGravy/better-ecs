import { RenderVisibility } from "@client/components/render-visibility";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { Placeable } from "@client/systems/world/build-mode/components";
import { GHOST_FILL, GHOST_STROKE } from "@client/systems/world/build-mode/const";
import type { EntityId, UserWorld } from "@engine";
import { AnimatedSprite, Shape, Sprite } from "@engine/components";

import { GhostPreviewComponent, type GhostKind } from "@client/entities/ghost/component";
import type { TransportBeltVariant } from "@client/entities/transport-belt";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GhostSpawner = () => EntityId;

type GhostVariant = TransportBeltVariant | null;

export type GhostPreset<TPayload = void> = {
  kind: GhostKind;
  spawn: (world: UserWorld, x: number, y: number, payload?: TPayload) => EntityId;
  sync?: (world: UserWorld, ghostEntityId: EntityId, payload?: TPayload) => void;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnGhost(
  world: UserWorld,
  spawn: GhostSpawner,
  kind: GhostKind = "box",
  variant: GhostVariant = null,
): EntityId {
  return applyGhostEffect(world, spawn(), kind, variant);
}

export function applyGhostEffect(
  world: UserWorld,
  ghostEntityId: EntityId,
  kind: GhostKind = "box",
  variant: GhostVariant = null,
): EntityId {
  world.add(ghostEntityId, CollisionProfiles.ghost());
  world.add(
    ghostEntityId,
    new GhostPreviewComponent(kind, variant),
  );

  stripPlacedOnlyComponents(world, ghostEntityId);
  applyGhostAppearance(world, ghostEntityId);

  return ghostEntityId;
}

function applyGhostAppearance(world: UserWorld, ghostEntityId: EntityId): void {
  const shape = world.get(ghostEntityId, Shape);

  if (shape) {
    shape.fill = GHOST_FILL;
    shape.stroke = GHOST_STROKE;
    shape.zOrder = Number.MAX_SAFE_INTEGER;
  }

  const animatedSprite = world.get(ghostEntityId, AnimatedSprite);

  if (animatedSprite) {
    animatedSprite.tint.set(1, 1, 1, 0.6);
    animatedSprite.zOrder = Number.MAX_SAFE_INTEGER;
    return;
  }

  const sprite = world.get(ghostEntityId, Sprite);

  if (sprite) {
    sprite.tint.set(1, 1, 1, 0.6);
    sprite.zOrder = Number.MAX_SAFE_INTEGER;
  }
}

function stripPlacedOnlyComponents(world: UserWorld, ghostEntityId: EntityId): void {
  if (world.has(ghostEntityId, Placeable)) {
    world.remove(ghostEntityId, Placeable);
  }

  if (world.has(ghostEntityId, RenderVisibility)) {
    world.remove(ghostEntityId, RenderVisibility);
  }
}

export { GhostPreviewComponent } from "@client/entities/ghost/component";
export type { GhostKind } from "@client/entities/ghost/component";

