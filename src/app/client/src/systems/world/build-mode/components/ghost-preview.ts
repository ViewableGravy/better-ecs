import { RENDER_LAYERS } from "@client/consts";
import type { TransportBeltVariant } from "@client/entities/transport-belt";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { BOX_SIZE, GHOST_FILL, GHOST_STROKE, HALF_BOX_SIZE } from "@client/systems/world/build-mode/const";
import type { EntityId, UserWorld } from "@engine";
import { Vec2 } from "@engine";
import { Color, Shape, Sprite, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GhostKind = "box" | "transport-belt";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const TRANSPORT_BELT_QUAD_SIZE = 40;
const TRANSPORT_BELT_FRAME_SIZE = 128;
const GHOST_TRANSPORT_BELT_TINT = new Color(1, 1, 1, 0.6);

/**
 * TODO: GhostPreview, like all components should not contain logic. we should make a Manager for it
 * that contains this logic. This should be fixed in this branch
 */
export class GhostPreview {
  private static readonly gridColliderInsetPx = 1;
  private static readonly insetBoxSize = BOX_SIZE - GhostPreview.gridColliderInsetPx * 2;
  private static readonly insetHalfBoxSize = HALF_BOX_SIZE - GhostPreview.gridColliderInsetPx;

  public constructor(
    public readonly kind: GhostKind = "box",
    public transportBeltVariant: TransportBeltVariant | null = null,
  ) {}

  /**
   * Spawns a new ghost preview entity at the specified position
   */
  public static spawn(world: UserWorld, x: number, y: number): EntityId {
    const ghost = world.create();
    world.add(ghost, new Transform2D(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE));
    world.add(
      ghost,
      new Shape("rectangle", BOX_SIZE, BOX_SIZE, GHOST_FILL, GHOST_STROKE, 1, Number.MAX_SAFE_INTEGER, 0),
    );
    world.add(
      ghost,
      new RectangleCollider(
        new Vec2(-GhostPreview.insetHalfBoxSize, -GhostPreview.insetHalfBoxSize),
        new Vec2(GhostPreview.insetBoxSize, GhostPreview.insetBoxSize),
      ),
    );
    world.add(ghost, CollisionProfiles.ghost());
    world.add(ghost, new GhostPreview("box"));
    return ghost;
  }

  public static spawnTransportBelt(
    world: UserWorld,
    x: number,
    y: number,
    variant: TransportBeltVariant,
  ): EntityId {
    const ghost = world.create();
    const scale = TRANSPORT_BELT_QUAD_SIZE / TRANSPORT_BELT_FRAME_SIZE;

    world.add(ghost, new Transform2D(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE));
    world.add(
      ghost,
      new Shape("rectangle", BOX_SIZE, BOX_SIZE, GHOST_FILL, GHOST_STROKE, 1, Number.MAX_SAFE_INTEGER - 1, 0),
    );
    world.add(
      ghost,
      new Sprite(
        `transport-belt:${variant}_1`,
        TRANSPORT_BELT_FRAME_SIZE * scale,
        TRANSPORT_BELT_FRAME_SIZE * scale,
        0.5,
        0.5,
        false,
        false,
        new Color(
          GHOST_TRANSPORT_BELT_TINT.r,
          GHOST_TRANSPORT_BELT_TINT.g,
          GHOST_TRANSPORT_BELT_TINT.b,
          GHOST_TRANSPORT_BELT_TINT.a,
        ),
        Number.MAX_SAFE_INTEGER,
        RENDER_LAYERS.world,
      ),
    );
    world.add(
      ghost,
      new RectangleCollider(
        new Vec2(-GhostPreview.insetHalfBoxSize, -GhostPreview.insetHalfBoxSize),
        new Vec2(GhostPreview.insetBoxSize, GhostPreview.insetBoxSize),
      ),
    );
    world.add(ghost, CollisionProfiles.ghost());
    world.add(ghost, new GhostPreview("transport-belt", variant));

    return ghost;
  }

  /**
   * Syncs an existing ghost entity or creates a new one if needed
   */
  public static sync(world: UserWorld, ghostEntityId: EntityId | null, x: number, y: number): EntityId {
    if (!this.matchesGhostKind(world, ghostEntityId, "box")) {
      if (ghostEntityId !== null && world.all().includes(ghostEntityId)) {
        world.destroy(ghostEntityId);
      }

      return GhostPreview.spawn(world, x, y);
    }

    const transform = world.require(ghostEntityId, Transform2D);
    
    // Set both curr and prev to prevent interpolation between grid squares
    transform.curr.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    transform.prev.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    return ghostEntityId;
  }

  public static syncTransportBelt(
    world: UserWorld,
    ghostEntityId: EntityId | null,
    x: number,
    y: number,
    variant: TransportBeltVariant,
  ): EntityId {
    if (!this.matchesGhostKind(world, ghostEntityId, "transport-belt")) {
      if (ghostEntityId !== null && world.all().includes(ghostEntityId)) {
        world.destroy(ghostEntityId);
      }

      return GhostPreview.spawnTransportBelt(world, x, y, variant);
    }

    const transform = world.require(ghostEntityId, Transform2D);
    const sprite = world.require(ghostEntityId, Sprite);

    transform.curr.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    transform.prev.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    sprite.assetId = `transport-belt:${variant}_1`;

    const ghostPreview = world.require(ghostEntityId, GhostPreview);
    ghostPreview.transportBeltVariant = variant;

    return ghostEntityId;
  }

  private static matchesGhostKind(
    world: UserWorld,
    ghostEntityId: EntityId | null,
    kind: GhostKind,
  ): ghostEntityId is EntityId {
    if (ghostEntityId === null || !world.has(ghostEntityId, GhostPreview)) {
      return false;
    }

    const ghostPreview = world.require(ghostEntityId, GhostPreview);

    if (ghostPreview.kind !== kind) {
      return false;
    }

    if (kind === "box") {
      return world.has(ghostEntityId, Shape);
    }

    return world.has(ghostEntityId, Sprite);
  }
}
