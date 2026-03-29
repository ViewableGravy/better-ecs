import {
    canConveyorStoreEntities,
    ConveyorBeltComponent,
    syncConveyorBeltDirectionsFromVariant,
} from "@client/components/conveyor-belt";
import {
    getTransportBeltVariantByFlow,
    type TransportBeltDirection,
    type TransportBeltFlow,
    type TransportBeltVariant,
} from "@client/entities/transport-belt/consts";
import {
    getOppositeTransportBeltDirection,
    isStraightTransportBeltFlow,
    TransportBeltGridQuery,
} from "@client/entities/transport-belt/core";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type NeighborCandidate = readonly [directionA: TransportBeltDirection, directionB: TransportBeltDirection];

type PreviewBeltVariantDerivationTarget = {
  coordinates: GridCoordinates;
  headDirection: TransportBeltDirection;
};

type ExistingBeltVariantDerivationTarget = {
  beltEntityId: TransportBeltEntityId;
};

export type TransportBeltVariantDerivationTarget =
  | PreviewBeltVariantDerivationTarget
  | ExistingBeltVariantDerivationTarget;

type BeltVariantDerivationState = {
  coordinates: GridCoordinates;
  headDirection: TransportBeltDirection;
  currentTailDirection: TransportBeltDirection | null;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const STRAIGHT_VARIANT_BY_HEAD_DIRECTION: Readonly<Record<TransportBeltDirection, TransportBeltVariant>> = {
  north: "vertical-up",
  east: "horizontal-right",
  south: "vertical-down",
  west: "horizontal-left",
};

const PERPENDICULAR_INCOMING_DIRECTIONS_BY_HEAD_DIRECTION: Readonly<Record<TransportBeltDirection, NeighborCandidate>> = {
  north: ["west", "east"],
  east: ["north", "south"],
  south: ["west", "east"],
  west: ["north", "south"],
};

export class TransportBeltRotationVariantManager {
  public static deriveBeltFlow(world: UserWorld, target: PreviewBeltVariantDerivationTarget): TransportBeltFlow;
  public static deriveBeltFlow(world: UserWorld, target: ExistingBeltVariantDerivationTarget): TransportBeltFlow | null;
  public static deriveBeltFlow(world: UserWorld, target: TransportBeltVariantDerivationTarget): TransportBeltFlow | null;
  public static deriveBeltFlow(world: UserWorld, target: TransportBeltVariantDerivationTarget): TransportBeltFlow | null {
    const state = this.resolveDerivationState(world, target);

    if (state === null) {
      return null;
    }

    const tailDirection = this.deriveTailDirection(world, state);

    return [tailDirection, state.headDirection];
  }

  public static deriveBeltVariant(world: UserWorld, target: PreviewBeltVariantDerivationTarget): TransportBeltVariant;
  public static deriveBeltVariant(world: UserWorld, target: ExistingBeltVariantDerivationTarget): TransportBeltVariant | null;
  public static deriveBeltVariant(world: UserWorld, target: TransportBeltVariantDerivationTarget): TransportBeltVariant | null {
    const flow = this.deriveBeltFlow(world, target);

    if (flow === null) {
      return null;
    }

    return this.resolveVariantFromFlow(flow[0], flow[1]);
  }

  private static resolveVariantFromFlow(tailDirection: TransportBeltDirection, headDirection: TransportBeltDirection): TransportBeltVariant {
    if (tailDirection === getOppositeTransportBeltDirection(headDirection)) {
      return STRAIGHT_VARIANT_BY_HEAD_DIRECTION[headDirection];
    }

    return getTransportBeltVariantByFlow(tailDirection, headDirection) ?? STRAIGHT_VARIANT_BY_HEAD_DIRECTION[headDirection];
  }

  private static resolveDerivationState(world: UserWorld, target: TransportBeltVariantDerivationTarget): BeltVariantDerivationState | null {
    if ("beltEntityId" in target) {
      const belt = world.get(target.beltEntityId, ConveyorBeltComponent);

      if (!belt || !canConveyorStoreEntities(belt.variant)) {
        return null;
      }

      syncConveyorBeltDirectionsFromVariant(belt);

      return {
        coordinates: TransportBeltGridQuery.resolveBeltCoordinates(world, target.beltEntityId),
        headDirection: belt.headDirection,
        currentTailDirection: belt.tailDirection,
      };
    }

    return {
      coordinates: target.coordinates,
      headDirection: target.headDirection,
      currentTailDirection: null,
    };
  }

  private static deriveTailDirection(world: UserWorld, state: BeltVariantDerivationState): TransportBeltDirection {
    const defaultTailDirection = getOppositeTransportBeltDirection(state.headDirection);

    if (this.shouldStayStraight(world, state, defaultTailDirection)) {
      return defaultTailDirection;
    }

    if (state.currentTailDirection !== null && this.isIncomingFromDirection(world, state.coordinates, state.currentTailDirection)) {
      return state.currentTailDirection;
    }

    const uniqueIncomingDirection = this.resolveUniqueIncomingDirection(world, state.coordinates, state.headDirection);

    if (uniqueIncomingDirection !== null) {
      return uniqueIncomingDirection;
    }

    return defaultTailDirection;
  }

  private static shouldStayStraight(
    world: UserWorld,
    state: BeltVariantDerivationState,
    defaultTailDirection: TransportBeltDirection,
  ): boolean {
    return this.isIncomingFromDirection(world, state.coordinates, defaultTailDirection)
      && this.doesHeadConsumeOutput(world, state.coordinates, state.headDirection);
  }

  private static doesHeadConsumeOutput(
    world: UserWorld,
    coordinates: GridCoordinates,
    direction: TransportBeltDirection,
  ): boolean {
    const neighborFlow = this.resolveNeighborFlow(world, coordinates, direction);

    if (!neighborFlow || !isStraightTransportBeltFlow(neighborFlow)) {
      return false;
    }

    const [neighborTailDirection] = neighborFlow;

    return neighborTailDirection === getOppositeTransportBeltDirection(direction);
  }

  private static resolveUniqueIncomingDirection(
    world: UserWorld,
    coordinates: GridCoordinates,
    headDirection: TransportBeltDirection,
  ): TransportBeltDirection | null {
    const defaultTailDirection = getOppositeTransportBeltDirection(headDirection);

    if (this.isIncomingFromDirection(world, coordinates, defaultTailDirection)) {
      return null;
    }

    const [candidateA, candidateB] = PERPENDICULAR_INCOMING_DIRECTIONS_BY_HEAD_DIRECTION[headDirection];
    const contributingDirections: TransportBeltDirection[] = [];

    if (this.isIncomingFromDirection(world, coordinates, candidateA)) {
      contributingDirections.push(candidateA);
    }

    if (this.isIncomingFromDirection(world, coordinates, candidateB)) {
      contributingDirections.push(candidateB);
    }

    if (contributingDirections.length !== 1) {
      return null;
    }

    return contributingDirections[0];
  }

  private static isIncomingFromDirection(
    world: UserWorld,
    coordinates: GridCoordinates,
    direction: TransportBeltDirection,
  ): boolean {
    const neighborFlow = this.resolveNeighborFlow(world, coordinates, direction);

    if (!neighborFlow) {
      return false;
    }

    const [, neighborHeadDirection] = neighborFlow;

    return neighborHeadDirection === getOppositeTransportBeltDirection(direction);
  }

  private static resolveNeighborFlow(
    world: UserWorld,
    coordinates: GridCoordinates,
    direction: TransportBeltDirection,
  ): TransportBeltFlow | null {
    const neighborEntityId = TransportBeltGridQuery.resolveNeighborEntityIdInDirection(world, coordinates, direction);

    if (neighborEntityId === null) {
      return null;
    }

    const neighborBelt = world.require(neighborEntityId, ConveyorBeltComponent);

    syncConveyorBeltDirectionsFromVariant(neighborBelt);

    return [neighborBelt.tailDirection, neighborBelt.headDirection];
  }
}