import { RenderVisibility } from "@client/components/render-visibility";
import { RENDER_LAYERS } from "@client/consts";
import { GhostPreviewComponent, type GhostKind } from "@client/entities/ghost/component";
import type { TransportBeltVariant } from "@client/entities/transport-belt";
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

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GhostVariant = TransportBeltVariant | null;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostUtils {
  public static applyEffect<TEntityId extends EntityId>(
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
      shape.fill = this.cloneColor(isPlaceable ? GHOST_FILL : INVALID_GHOST_FILL);
      shape.stroke = this.cloneColor(isPlaceable ? GHOST_STROKE : INVALID_GHOST_STROKE);
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

    this.createIndicatorSlash(world, indicatorEntityId, Math.PI * 0.25, lineColor);
    this.createIndicatorSlash(world, indicatorEntityId, -Math.PI * 0.25, lineColor);

    ghostPreview.invalidIndicatorEntityId = indicatorEntityId;
  }

  private static createIndicatorSlash(
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

  private static cloneColor(color: Color): Color {
    return new Color(color.r, color.g, color.b, color.a);
  }
}