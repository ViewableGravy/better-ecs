import { RenderVisibility } from "@client/components/render-visibility";
import { RENDER_LAYERS } from "@client/consts";
import { GhostPreviewComponent, type GhostKind } from "@client/entities/ghost/component";
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
import { AnimatedSprite, FillColor, Parent, Rgba, Shape, Sprite, StrokeColor, Tint, Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostUtils {
  public static applyEffect<TEntityId extends EntityId>(
    world: UserWorld,
    ghostEntityId: TEntityId,
    kind: GhostKind = "box",
    ownerId: string = "local-player",
    previewVariant: string | null = null,
  ): TEntityId {
    world.add(ghostEntityId, CollisionProfiles.ghost());
    world.add(
      ghostEntityId,
      new GhostPreviewComponent(kind, ownerId, previewVariant),
    );

    this.stripPlacedOnlyComponents(world, ghostEntityId);
    this.syncPlacementState(world, ghostEntityId, true);

    return ghostEntityId;
  }

  public static syncPlacementState(
    world: UserWorld,
    ghostEntityId: EntityId,
    isPlaceable: boolean,
  ): void {
    const ghostPreview = world.require(ghostEntityId, GhostPreviewComponent);

    ghostPreview.isPlaceable = isPlaceable;
    this.applyAppearance(world, ghostEntityId, isPlaceable);
    this.syncInvalidPlacementIndicator(world, ghostEntityId, ghostPreview, isPlaceable);
  }

  private static applyAppearance(world: UserWorld, ghostEntityId: EntityId, isPlaceable: boolean): void {
    const shape = world.get(ghostEntityId, Shape);

    if (shape) {
      const fillColor = world.get(ghostEntityId, FillColor);
      const nextFill = this.cloneColor(isPlaceable ? GHOST_FILL : INVALID_GHOST_FILL);
      const strokeColor = world.get(ghostEntityId, StrokeColor);
      const nextStroke = this.cloneColor(isPlaceable ? GHOST_STROKE : INVALID_GHOST_STROKE);

      if (fillColor) {
        fillColor.value.copyFrom(nextFill);
      } else {
        world.add(ghostEntityId, new FillColor(nextFill));
      }

      if (strokeColor) {
        strokeColor.value.copyFrom(nextStroke);
      } else {
        world.add(ghostEntityId, new StrokeColor(nextStroke));
      }

      shape.zOrder = Number.MAX_SAFE_INTEGER;
    }

    const animatedSprite = world.get(ghostEntityId, AnimatedSprite);

    if (animatedSprite) {
      this.syncTint(world, ghostEntityId, isPlaceable ? VALID_GHOST_TINT : INVALID_GHOST_TINT);
      animatedSprite.zOrder = Number.MAX_SAFE_INTEGER;
      return;
    }

    const sprite = world.get(ghostEntityId, Sprite);

    if (sprite) {
      this.syncTint(world, ghostEntityId, isPlaceable ? VALID_GHOST_TINT : INVALID_GHOST_TINT);
      sprite.zOrder = Number.MAX_SAFE_INTEGER;
    }
  }

  private static syncTint(world: UserWorld, entityId: EntityId, color: Rgba): void {
    const tint = world.get(entityId, Tint);

    if (tint) {
      tint.value.copyFrom(color);
      return;
    }

    world.add(entityId, new Tint(this.cloneColor(color)));
  }

  private static stripPlacedOnlyComponents(world: UserWorld, ghostEntityId: EntityId): void {
    if (world.has(ghostEntityId, Placeable)) {
      world.remove(ghostEntityId, Placeable);
    }

    if (world.has(ghostEntityId, RenderVisibility)) {
      world.remove(ghostEntityId, RenderVisibility);
    }
  }

  private static syncInvalidPlacementIndicator(
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
    const lineColor = new Rgba(1, 0.94, 0.94, 0.96);
    const circleFill = new Rgba(0.6, 0.05, 0.08, 0.9);
    const circleStroke = new Rgba(1, 0.45, 0.45, 0.98);
    const indicatorShape = new Shape(
      "circle",
      12,
      12,
      1.5,
      Number.MAX_SAFE_INTEGER,
      RENDER_LAYERS.world,
    );

    world.add(indicatorEntityId, new Parent(ghostEntityId));
    world.add(indicatorEntityId, new Transform2D(7, -7));
    world.add(indicatorEntityId, indicatorShape);
    world.add(indicatorEntityId, new FillColor(circleFill));
    world.add(indicatorEntityId, new StrokeColor(circleStroke));

    this.createIndicatorSlash(world, indicatorEntityId, Math.PI * 0.25, lineColor);
    this.createIndicatorSlash(world, indicatorEntityId, -Math.PI * 0.25, lineColor);

    ghostPreview.invalidIndicatorEntityId = indicatorEntityId;
  }

  private static createIndicatorSlash(
    world: UserWorld,
    parentEntityId: EntityId,
    rotation: number,
    stroke: Rgba,
  ): void {
    const slashEntityId = world.create();
    const slashShape = new Shape(
      "line",
      7,
      0,
      1.75,
      Number.MAX_SAFE_INTEGER,
      RENDER_LAYERS.world,
    );

    world.add(slashEntityId, new Parent(parentEntityId));
    world.add(slashEntityId, new Transform2D(0, 0, rotation));
    world.add(slashEntityId, slashShape);
    world.add(slashEntityId, new FillColor(new Rgba(0, 0, 0, 0)));
    world.add(slashEntityId, new StrokeColor(stroke));
  }

  private static cloneColor(color: Rgba): Rgba {
    return new Rgba(color.r, color.g, color.b, color.a);
  }
}