import { RENDER_LAYERS } from "@legacy/consts";
import { GhostPreviewComponent, type GhostKind } from "@legacy/entities/ghost/component";
import { CollisionProfiles } from "@legacy/scenes/world/physics/collision-profiles";
import { Placeable } from "@legacy/systems/world/build-mode/components";
import {
    GHOST_FILL,
    GHOST_STROKE,
    INVALID_GHOST_FILL,
    INVALID_GHOST_STROKE,
    INVALID_GHOST_TINT,
    VALID_GHOST_TINT,
} from "@legacy/systems/world/build-mode/const";
import type { EntityId, Registry } from "@engine";
import { AnimatedSprite, FillColor, Rgba, Shape, Sprite, StrokeColor, Tint, Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostUtils {
  public static destroyOwned(world: Registry, ownerId: string): void {
    for (const ghostEntityId of world.query(GhostPreviewComponent)) {
      const ghostPreview = world.require(ghostEntityId, GhostPreviewComponent);
      if (ghostPreview.ownerId === ownerId) {
        world.destroy(ghostEntityId);
      }
    }
  }

  public static applyEffect<TEntityId extends EntityId>(
    world: Registry,
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
    world: Registry,
    ghostEntityId: EntityId,
    isPlaceable: boolean,
  ): void {
    const ghostPreview = world.patch(ghostEntityId, GhostPreviewComponent, (component) => {
      component.isPlaceable = isPlaceable;
    });
    this.applyAppearance(world, ghostEntityId, isPlaceable);
    this.syncInvalidPlacementIndicator(world, ghostEntityId, ghostPreview, isPlaceable);
  }

  private static applyAppearance(world: Registry, ghostEntityId: EntityId, isPlaceable: boolean): void {
    const shape = world.get(ghostEntityId, Shape);

    if (shape) {
      const fillColor = world.get(ghostEntityId, FillColor);
      const nextFill = this.cloneColor(isPlaceable ? GHOST_FILL : INVALID_GHOST_FILL);
      const strokeColor = world.get(ghostEntityId, StrokeColor);
      const nextStroke = this.cloneColor(isPlaceable ? GHOST_STROKE : INVALID_GHOST_STROKE);

      if (fillColor) {
        world.patch(ghostEntityId, FillColor, (component) => component.value.copyFrom(nextFill));
      } else {
        world.add(ghostEntityId, new FillColor(nextFill));
      }

      if (strokeColor) {
        world.patch(ghostEntityId, StrokeColor, (component) => component.value.copyFrom(nextStroke));
      } else {
        world.add(ghostEntityId, new StrokeColor(nextStroke));
      }

      world.patch(ghostEntityId, Shape, (component) => {
        component.zOrder = Number.MAX_SAFE_INTEGER;
      });
    }

    const animatedSprite = world.get(ghostEntityId, AnimatedSprite);

    if (animatedSprite) {
      this.syncTint(world, ghostEntityId, isPlaceable ? VALID_GHOST_TINT : INVALID_GHOST_TINT);
      world.patch(ghostEntityId, AnimatedSprite, (component) => {
        component.zOrder = Number.MAX_SAFE_INTEGER;
      });
      return;
    }

    const sprite = world.get(ghostEntityId, Sprite);

    if (sprite) {
      this.syncTint(world, ghostEntityId, isPlaceable ? VALID_GHOST_TINT : INVALID_GHOST_TINT);
      world.patch(ghostEntityId, Sprite, (component) => {
        component.zOrder = Number.MAX_SAFE_INTEGER;
      });
    }
  }

  private static syncTint(world: Registry, entityId: EntityId, color: Rgba): void {
    const tint = world.get(entityId, Tint);

    if (tint) {
      world.patch(entityId, Tint, (component) => component.value.copyFrom(color));
      return;
    }

    world.add(entityId, new Tint(this.cloneColor(color)));
  }

  private static stripPlacedOnlyComponents(world: Registry, ghostEntityId: EntityId): void {
    if (world.has(ghostEntityId, Placeable)) {
      world.remove(ghostEntityId, Placeable);
    }

  }

  private static syncInvalidPlacementIndicator(
    world: Registry,
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

    world.setParent(indicatorEntityId, ghostEntityId);
    world.add(indicatorEntityId, new Transform2D(7, -7));
    world.add(indicatorEntityId, indicatorShape);
    world.add(indicatorEntityId, new FillColor(circleFill));
    world.add(indicatorEntityId, new StrokeColor(circleStroke));

    this.createIndicatorSlash(world, indicatorEntityId, Math.PI * 0.25, lineColor);
    this.createIndicatorSlash(world, indicatorEntityId, -Math.PI * 0.25, lineColor);

    ghostPreview.invalidIndicatorEntityId = indicatorEntityId;
  }

  private static createIndicatorSlash(
    world: Registry,
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

    world.setParent(slashEntityId, parentEntityId);
    world.add(slashEntityId, new Transform2D(0, 0, rotation));
    world.add(slashEntityId, slashShape);
    world.add(slashEntityId, new FillColor(new Rgba(0, 0, 0, 0)));
    world.add(slashEntityId, new StrokeColor(stroke));
  }

  private static cloneColor(color: Rgba): Rgba {
    return new Rgba(color.r, color.g, color.b, color.a);
  }
}
