import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { OUTSIDE, RenderVisibility } from "@client/components/render-visibility";
import {
    getTransportBeltFlow,
    type TransportBeltVariant,
} from "@client/entities/transport-belt/consts";
import { createTransportBeltSprite } from "@client/entities/transport-belt/render/createTransportBeltSprite";
import { TransportBeltConnectionUtils } from "@client/entities/transport-belt/topology/TransportBeltConnectionUtils";
import {
    asTransportBeltEntityId,
    type TransportBeltEntityId,
} from "@client/entities/transport-belt/types";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { TRANSPORT_BELT_COLLIDER_SIZE } from "@client/systems/world/build-mode/metrics";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import { AnimatedSprite, Debug, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
import invariant from "tiny-invariant";
const HALF_TRANSPORT_BELT_COLLIDER_SIZE = TRANSPORT_BELT_COLLIDER_SIZE * 0.5;

type TransportBeltSpawnProfile = "placed" | "preview";

type SpawnTransportBeltOptions = {
  x: number;
  y: number;
  variant?: TransportBeltVariant;
  speed?: number;
  connectToNeighbors?: boolean;
  profile?: TransportBeltSpawnProfile;
};

export function spawnTransportBelt(world: UserWorld, options: SpawnTransportBeltOptions): TransportBeltEntityId {
  const variant = options.variant ?? "horizontal-right";
  const profile = options.profile ?? "placed";

  const belt = asTransportBeltEntityId(world.create());
  const sprite = createTransportBeltSprite(variant, options.y);

  world.add(belt, new Transform2D(options.x, options.y, 0));
  world.add(belt, sprite);

  if (profile === "preview") {
    world.add(belt, new Debug("transport-belt-ghost"));

    return belt;
  }

  world.add(
    belt,
    new RectangleCollider(
      new Vec2(-HALF_TRANSPORT_BELT_COLLIDER_SIZE, -HALF_TRANSPORT_BELT_COLLIDER_SIZE),
      new Vec2(TRANSPORT_BELT_COLLIDER_SIZE, TRANSPORT_BELT_COLLIDER_SIZE),
    ),
  );
  world.add(belt, CollisionProfiles.conveyor());
  world.add(belt, new ConveyorBeltComponent(variant, options.speed));
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

  if (belt && belt.variant === variant) {
    return;
  }

  const transform = world.require(beltEntityId, Transform2D);

  const currentSprite = world.get(beltEntityId, AnimatedSprite);

  if (belt) {
    const flow = getTransportBeltFlow(variant);

    invariant(flow, `No transport belt flow found for variant ${variant}`);

    const [tailDirection, headDirection] = flow;

    belt.variant = variant;
    belt.tailDirection = tailDirection;
    belt.headDirection = headDirection;
  }

  world.add(
    beltEntityId,
    createTransportBeltSprite(variant, transform.curr.pos.y, currentSprite),
  );
}

export {
    getTransportBeltDirectionFromPlacementSide,
    TRANSPORT_BELT_DIRECTIONS,
    TRANSPORT_BELT_VARIANTS
} from "@client/entities/transport-belt/consts";
export type {
    TransportBeltDirection,
    TransportBeltVariant
} from "@client/entities/transport-belt/consts";
export { ConveyorUtils } from "@client/entities/transport-belt/ConveyorUtils";
export {
    getConveyorLaneProgress,
    getConveyorLaneSlots,
    getOppositeTransportBeltDirection,
    getTransportBeltDirectionVector,
    getTransportBeltFlowVector,
    getTransportBeltInwardNormal,
    getTransportBeltOutwardNormal,
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
    CONVEYOR_ANIMATION_FRAMES_PER_SLOT,
    CONVEYOR_ANIMATION_PLAYBACK_RATE,
    CONVEYOR_ANIMATION_TICKS_PER_FRAME,
    CONVEYOR_SIDES,
    CONVEYOR_SLOT_COUNT_PER_LANE,
    CONVEYOR_SLOT_INDICES_ASC,
    CONVEYOR_SLOT_INDICES_DESC,
    getCurveLaneSides,
    getSlotAdvanceTicks,
    INSIDE_CURVE_SLOT_ADVANCE_TICKS,
    INSIDE_CURVE_SPEED_MULTIPLIER,
    SHARED_SLOT_POSITION,
    SLOT_ADVANCE_TICKS
} from "@client/entities/transport-belt/motion/constants";
export { ConveyorEntityMotionUtils } from "@client/entities/transport-belt/motion/ConveyorEntityMotionUtils";
export { ConveyorGeometryUtils } from "@client/entities/transport-belt/motion/ConveyorGeometryUtils";
export { ConveyorMovementUtils } from "@client/entities/transport-belt/motion/ConveyorMovementUtils";
export { ConveyorSideLoadUtils } from "@client/entities/transport-belt/motion/ConveyorSideLoadUtils";
export type { ConveyorSideLoadTransfer } from "@client/entities/transport-belt/motion/types";
export { ConveyorBeltChainIterator } from "@client/entities/transport-belt/topology/ConveyorBeltChainIterator";
export { TransportBeltConnectionUtils } from "@client/entities/transport-belt/topology/TransportBeltConnectionUtils";
export type { TransportBeltEntityId } from "@client/entities/transport-belt/types";

