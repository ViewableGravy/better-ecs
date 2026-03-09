import { RenderVisibility } from "@client/components/render-visibility";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { Placeable } from "@client/systems/world/build-mode/components";
import {
  GHOST_FILL,
  GHOST_STROKE,
  INVALID_GHOST_FILL,
  INVALID_GHOST_STROKE,
  INVALID_GHOST_TINT,
  VALID_GHOST_TINT,
} from "@client/systems/world/build-mode/const";
import type { EntityId, UserWorld } from "@engine";
import { AnimatedSprite, Color, Parent, Shape, Sprite, Transform2D } from "@engine/components";

import { RENDER_LAYERS } from "@client/consts";
import { GhostPreviewComponent, type GhostKind } from "@client/entities/ghost/component";
import type { TransportBeltVariant } from "@client/entities/transport-belt";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GhostSpawner<TEntityId extends EntityId = EntityId> = () => TEntityId;

type GhostVariant = TransportBeltVariant | null;

export type GhostPreset<TPayload = void, TEntityId extends EntityId = EntityId> = {
  kind: GhostKind;
  spawn: (world: UserWorld, x: number, y: number, payload?: TPayload) => TEntityId;
  sync?: (world: UserWorld, ghostEntityId: TEntityId, payload?: TPayload) => void;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnGhost<TEntityId extends EntityId>(
  world: UserWorld,
  spawn: GhostSpawner<TEntityId>,
  kind: GhostKind = "box",
  variant: GhostVariant = null,
): TEntityId {
  return applyGhostEffect(world, spawn(), kind, variant);
}

export function applyGhostEffect<TEntityId extends EntityId>(
  world: UserWorld,
  ghostEntityId: TEntityId,
  kind: GhostKind = "box",
  variant: GhostVariant = null,
): TEntityId {
  world.add(ghostEntityId, CollisionProfiles.ghost());
  world.add(
    ghostEntityId,
    new GhostPreviewComponent(kind, variant),
  );

  stripPlacedOnlyComponents(world, ghostEntityId);
  syncGhostPlacementState(world, ghostEntityId, true);

  return ghostEntityId;
}

export function syncGhostPlacementState(
  world: UserWorld,
  ghostEntityId: EntityId,
  isPlaceable: boolean,
): void {
  const ghostPreview = world.require(ghostEntityId, GhostPreviewComponent);

  ghostPreview.isPlaceable = isPlaceable;
  applyGhostAppearance(world, ghostEntityId, isPlaceable);
  syncInvalidPlacementIndicator(world, ghostEntityId, ghostPreview, isPlaceable);
}

function applyGhostAppearance(world: UserWorld, ghostEntityId: EntityId, isPlaceable: boolean): void {
  const shape = world.get(ghostEntityId, Shape);

  if (shape) {
    shape.fill = cloneColor(isPlaceable ? GHOST_FILL : INVALID_GHOST_FILL);
    shape.stroke = cloneColor(isPlaceable ? GHOST_STROKE : INVALID_GHOST_STROKE);
    shape.zOrder = Number.MAX_SAFE_INTEGER;
  }

  const animatedSprite = world.get(ghostEntityId, AnimatedSprite);

  if (animatedSprite) {
    animatedSprite.tint.set(
      isPlaceable ? VALID_GHOST_TINT.r : INVALID_GHOST_TINT.r,
      isPlaceable ? VALID_GHOST_TINT.g : INVALID_GHOST_TINT.g,
      isPlaceable ? VALID_GHOST_TINT.b : INVALID_GHOST_TINT.b,
      isPlaceable ? VALID_GHOST_TINT.a : INVALID_GHOST_TINT.a,
    );
    animatedSprite.zOrder = Number.MAX_SAFE_INTEGER;
    return;
  }

  const sprite = world.get(ghostEntityId, Sprite);

  if (sprite) {
    sprite.tint.set(
      isPlaceable ? VALID_GHOST_TINT.r : INVALID_GHOST_TINT.r,
      isPlaceable ? VALID_GHOST_TINT.g : INVALID_GHOST_TINT.g,
      isPlaceable ? VALID_GHOST_TINT.b : INVALID_GHOST_TINT.b,
      isPlaceable ? VALID_GHOST_TINT.a : INVALID_GHOST_TINT.a,
    );
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

function syncInvalidPlacementIndicator(
  world: UserWorld,
  ghostEntityId: EntityId,
  ghostPreview: GhostPreviewComponent,
  isPlaceable: boolean,
): void {
  if (isPlaceable) {
    if (ghostPreview.invalidIndicatorEntityId !== null) {
      world.destroy(ghostPreview.invalidIndicatorEntityId);
      ghostPreview.invalidIndicatorEntityId = null;
    }

    return;
  }

  if (ghostPreview.invalidIndicatorEntityId !== null) {
    return;
  }

  const indicatorEntityId = world.create();
  const lineColor = new Color(1, 0.94, 0.94, 0.96);
  const circleFill = new Color(0.6, 0.05, 0.08, 0.9);
  const circleStroke = new Color(1, 0.45, 0.45, 0.98);

  world.add(indicatorEntityId, new Parent(ghostEntityId));
  world.add(indicatorEntityId, new Transform2D(7, -7));
  world.add(
    indicatorEntityId,
    new Shape(
      "circle",
      12,
      12,
      circleFill,
      circleStroke,
      1.5,
      Number.MAX_SAFE_INTEGER,
      RENDER_LAYERS.world,
    ),
  );

  createIndicatorSlash(world, indicatorEntityId, Math.PI * 0.25, lineColor);
  createIndicatorSlash(world, indicatorEntityId, -Math.PI * 0.25, lineColor);

  ghostPreview.invalidIndicatorEntityId = indicatorEntityId;
}

function createIndicatorSlash(
  world: UserWorld,
  parentEntityId: EntityId,
  rotation: number,
  stroke: Color,
): void {
  const slashEntityId = world.create();

  world.add(slashEntityId, new Parent(parentEntityId));
  world.add(slashEntityId, new Transform2D(0, 0, rotation));
  world.add(
    slashEntityId,
    new Shape(
      "line",
      7,
      0,
      new Color(0, 0, 0, 0),
      stroke,
      1.75,
      Number.MAX_SAFE_INTEGER,
      RENDER_LAYERS.world,
    ),
  );
}

function cloneColor(color: Color): Color {
  return new Color(color.r, color.g, color.b, color.a);
}

export { GhostPreviewComponent } from "@client/entities/ghost/component";
export type { GhostKind } from "@client/entities/ghost/component";

