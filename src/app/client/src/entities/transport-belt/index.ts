import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { OUTSIDE, RenderVisibility } from "@client/components/render-visibility";
import { RENDER_LAYERS } from "@client/consts";
import type { TransportBeltVariant } from "@client/entities/transport-belt/consts";
import { TransportBeltConnectionUtils } from "@client/entities/transport-belt/topology/TransportBeltConnectionUtils";
import {
  asTransportBeltEntityId,
  type TransportBeltEntityId,
} from "@client/entities/transport-belt/types";
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

export function spawnTransportBelt(world: UserWorld, options: SpawnTransportBeltOptions): TransportBeltEntityId {
  const variant = options.variant ?? "horizontal-right";

  const belt = asTransportBeltEntityId(world.create());
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
  beltEntityId: TransportBeltEntityId,
  variant: TransportBeltVariant,
): void {
  const belt = world.get(beltEntityId, ConveyorBeltComponent);

  if (belt.variant === variant) {
    return;
  }

  const transform = world.get(beltEntityId, Transform2D);

  const currentSprite = world.get(beltEntityId, AnimatedSprite);

  belt.variant = variant;
  world.add(
    beltEntityId,
    createTransportBeltSprite(variant, transform.curr.pos.y, currentSprite),
  );
}

export { TRANSPORT_BELT_VARIANTS } from "@client/entities/transport-belt/consts";
export type { TransportBeltVariant } from "@client/entities/transport-belt/consts";
export { ConveyorUtils } from "@client/entities/transport-belt/ConveyorUtils";
export {
  getConveyorLaneProgress,
  getConveyorLaneSlots,
  getOppositeTransportBeltSide,
  getTransportBeltFlowVector,
  getTransportBeltInwardNormal,
  getTransportBeltOutwardNormal,
  getTransportBeltSideVector,
  getTransportBeltVariantDescriptor,
  isConveyorLaneTailBlocked,
  isHorizontalTransportBeltFlow,
  isStraightTransportBeltFlow,
  isVerticalTransportBeltFlow,
  resolveConveyorSlotLocalPosition,
  setConveyorLaneTailBlocked,
  TransportBeltGridQuery
} from "@client/entities/transport-belt/core";
export { BeltItemRailsUtility } from "@client/entities/transport-belt/motion/BeltItemRailsUtility";
export {
  CONVEYOR_SIDES,
  CONVEYOR_SLOT_COUNT_PER_LANE,
  CONVEYOR_SLOT_INDICES_ASC,
  CONVEYOR_SLOT_INDICES_DESC,
  getCurveLaneSides,
  getSlotAdvanceDurations,
  INSIDE_CURVE_SLOT_ADVANCE_DURATION_MS,
  INSIDE_CURVE_SPEED_MULTIPLIER,
  SHARED_SLOT_POSITION,
  SLOT_ADVANCE_DURATION_MS
} from "@client/entities/transport-belt/motion/constants";
export { ConveyorEntityMotionUtils } from "@client/entities/transport-belt/motion/ConveyorEntityMotionUtils";
export { ConveyorGeometryUtils } from "@client/entities/transport-belt/motion/ConveyorGeometryUtils";
export { ConveyorMovementUtils } from "@client/entities/transport-belt/motion/ConveyorMovementUtils";
export { ConveyorSideLoadUtils } from "@client/entities/transport-belt/motion/ConveyorSideLoadUtils";
export type { ConveyorSideLoadTransfer } from "@client/entities/transport-belt/motion/types";
export { ConveyorBeltChainIterator } from "@client/entities/transport-belt/topology/ConveyorBeltChainIterator";
export { TransportBeltConnectionUtils } from "@client/entities/transport-belt/topology/TransportBeltConnectionUtils";
export type { TransportBeltEntityId } from "@client/entities/transport-belt/types";

