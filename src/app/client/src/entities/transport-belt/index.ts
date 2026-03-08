import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { OUTSIDE, RenderVisibility } from "@client/components/render-visibility";
import { RENDER_LAYERS } from "@client/consts";
import type { TransportBeltVariant } from "@client/entities/transport-belt/consts";
import { TransportBeltConnectionUtils } from "@client/entities/transport-belt/utils/connection";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { TRANSPORT_BELT_COLLIDER_SIZE } from "@client/systems/world/build-mode/const";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import { AnimatedSprite, Color, Debug, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
const TRANSPORT_BELT_FRAMES = [
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16,
] as const;

const TRANSPORT_BELT_QUAD_SIZE = 40;
const TRANSPORT_BELT_FRAME_SIZE = 128;
const TRANSPORT_BELT_Z_BASE = 0.2;
const TRANSPORT_BELT_Z_PER_WORLD_Y = 0.000001;
const HALF_TRANSPORT_BELT_COLLIDER_SIZE = TRANSPORT_BELT_COLLIDER_SIZE * 0.5;

type SpawnTransportBeltOptions = {
  x: number;
  y: number;
  variant?: TransportBeltVariant;
  speed?: number;
  connectToNeighbors?: boolean;
};

function createTransportBeltSprite(
  variant: TransportBeltVariant,
  worldY: number,
  previousSprite?: AnimatedSprite,
): AnimatedSprite {
  const scale = TRANSPORT_BELT_QUAD_SIZE / TRANSPORT_BELT_FRAME_SIZE;
  const sprite = new AnimatedSprite({
    assets: TRANSPORT_BELT_FRAMES.map((frame) => `transport-belt:${variant}_${frame}` as const),
    width: TRANSPORT_BELT_FRAME_SIZE * scale,
    height: TRANSPORT_BELT_FRAME_SIZE * scale,
    tint: previousSprite
      ? new Color(
        previousSprite.tint.r,
        previousSprite.tint.g,
        previousSprite.tint.b,
        previousSprite.tint.a,
      )
      : undefined,
    useGlobalOffset: true,
  });

  sprite.playbackRate = previousSprite?.playbackRate ?? 0.5;
  sprite.startTime = previousSprite?.startTime ?? sprite.startTime;
  sprite.layer = previousSprite?.layer ?? RENDER_LAYERS.world;
  sprite.zOrder = TRANSPORT_BELT_Z_BASE + worldY * TRANSPORT_BELT_Z_PER_WORLD_Y;

  return sprite;
}

export function spawnTransportBelt(world: UserWorld, options: SpawnTransportBeltOptions): EntityId {
  const variant = options.variant ?? "horizontal-right";

  const belt = world.create();
  const sprite = createTransportBeltSprite(variant, options.y);

  world.add(belt, new Transform2D(options.x, options.y, 0));
  world.add(
    belt,
    new RectangleCollider(
      new Vec2(-HALF_TRANSPORT_BELT_COLLIDER_SIZE, -HALF_TRANSPORT_BELT_COLLIDER_SIZE),
      new Vec2(TRANSPORT_BELT_COLLIDER_SIZE, TRANSPORT_BELT_COLLIDER_SIZE),
    ),
  );
  world.add(belt, CollisionProfiles.conveyor());
  world.add(belt, new ConveyorBeltComponent(variant, options.speed));
  world.add(belt, sprite);
  world.add(belt, new RenderVisibility(OUTSIDE, 1));
  world.add(belt, new Debug("transport-belt"));

  if (options.connectToNeighbors ?? true) {
    TransportBeltConnectionUtils.connectSpawnedBelt(world, belt);
  }

  return belt;
}

export function destroyTransportBelt(world: UserWorld, beltEntityId: EntityId): void {
  TransportBeltConnectionUtils.destroyBelt(world, beltEntityId);
}

export function updateTransportBeltVariant(
  world: UserWorld,
  beltEntityId: EntityId,
  variant: TransportBeltVariant,
): void {
  const belt = world.get(beltEntityId, ConveyorBeltComponent);

  if (!belt || belt.variant === variant) {
    return;
  }

  const transform = world.get(beltEntityId, Transform2D);

  if (!transform) {
    return;
  }

  const currentSprite = world.get(beltEntityId, AnimatedSprite);

  belt.variant = variant;
  world.add(
    beltEntityId,
    createTransportBeltSprite(variant, transform.curr.pos.y, currentSprite),
  );
}

export { TRANSPORT_BELT_VARIANTS } from "@client/entities/transport-belt/consts";
export type { TransportBeltVariant } from "@client/entities/transport-belt/consts";
export { TransportBeltConnectionUtils } from "@client/entities/transport-belt/utils/connection";
export { ConveyorUtils } from "@client/entities/transport-belt/utils/general";
export { BeltItemRailsUtility } from "@client/entities/transport-belt/utils/rails";

