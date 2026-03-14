import { canConveyorStoreEntities, ConveyorBeltComponent } from "@client/components/conveyor-belt";
import {
    getTransportBeltVariantByFlow,
    type TransportBeltSide,
    type TransportBeltVariant,
} from "@client/entities/transport-belt/consts";
import {
    getOppositeTransportBeltSide,
    getTransportBeltVariantDescriptor,
    TransportBeltGridQuery,
    type TransportBeltVariantDescriptor,
} from "@client/entities/transport-belt/core";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type NeighborCandidate = readonly [sideA: TransportBeltSide, sideB: TransportBeltSide];

type PreviewBeltVariantDerivationTarget = {
  coordinates: GridCoordinates;
  endSide: TransportBeltSide;
};

type ExistingBeltVariantDerivationTarget = {
  beltEntityId: TransportBeltEntityId;
};

export type TransportBeltVariantDerivationTarget =
  | PreviewBeltVariantDerivationTarget
  | ExistingBeltVariantDerivationTarget;

type BeltVariantDerivationState = {
  coordinates: GridCoordinates;
  endSide: TransportBeltSide;
  currentStartSide: TransportBeltSide | null;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const STRAIGHT_VARIANT_BY_END_SIDE: Readonly<Record<TransportBeltSide, TransportBeltVariant>> = {
  top: "vertical-up",
  right: "horizontal-right",
  bottom: "vertical-down",
  left: "horizontal-left",
};

const PERPENDICULAR_INCOMING_SIDES_BY_END_SIDE: Readonly<Record<TransportBeltSide, NeighborCandidate>> = {
  top: ["left", "right"],
  right: ["top", "bottom"],
  bottom: ["left", "right"],
  left: ["top", "bottom"],
};

export class TransportBeltRotationVariantManager {
  public static deriveBeltVariant(
    world: UserWorld,
    target: PreviewBeltVariantDerivationTarget,
  ): TransportBeltVariant;

  public static deriveBeltVariant(
    world: UserWorld,
    target: ExistingBeltVariantDerivationTarget,
  ): TransportBeltVariant | null;

  public static deriveBeltVariant(
    world: UserWorld,
    target: TransportBeltVariantDerivationTarget,
  ): TransportBeltVariant | null {
    const state = this.resolveDerivationState(world, target);

    if (state === null) {
      return null;
    }

    const startSide = this.deriveTailSide(world, state);

    return this.resolveVariantFromFlow(startSide, state.endSide);
  }

  private static resolveVariantFromFlow(
    startSide: TransportBeltSide,
    endSide: TransportBeltSide,
  ): TransportBeltVariant {
    if (startSide === getOppositeTransportBeltSide(endSide)) {
      return STRAIGHT_VARIANT_BY_END_SIDE[endSide];
    }

    return getTransportBeltVariantByFlow(startSide, endSide) ?? STRAIGHT_VARIANT_BY_END_SIDE[endSide];
  }

  private static resolveDerivationState(
    world: UserWorld,
    target: TransportBeltVariantDerivationTarget,
  ): BeltVariantDerivationState | null {
    if ("beltEntityId" in target) {
      const belt = world.get(target.beltEntityId, ConveyorBeltComponent);

      if (!canConveyorStoreEntities(belt.variant)) {
        return null;
      }

      const descriptor = getTransportBeltVariantDescriptor(belt.variant);

      if (!descriptor) {
        return null;
      }

      const [currentStartSide, endSide] = descriptor.flow;

      return {
        coordinates: TransportBeltGridQuery.resolveBeltCoordinates(world, target.beltEntityId),
        endSide,
        currentStartSide,
      };
    }

    return {
      coordinates: target.coordinates,
      endSide: target.endSide,
      currentStartSide: null,
    };
  }

  private static deriveTailSide(
    world: UserWorld,
    state: BeltVariantDerivationState,
  ): TransportBeltSide {
    const defaultTailSide = getOppositeTransportBeltSide(state.endSide);

    if (this.shouldStayStraight(world, state, defaultTailSide)) {
      return defaultTailSide;
    }

    if (state.currentStartSide !== null && this.isIncomingFromSide(world, state.coordinates, state.currentStartSide)) {
      return state.currentStartSide;
    }

    const uniqueIncomingSide = this.resolveUniqueIncomingSide(world, state.coordinates, state.endSide);

    if (uniqueIncomingSide !== null) {
      return uniqueIncomingSide;
    }

    return defaultTailSide;
  }

  private static shouldStayStraight(
    world: UserWorld,
    state: BeltVariantDerivationState,
    defaultTailSide: TransportBeltSide,
  ): boolean {
    return this.isIncomingFromSide(world, state.coordinates, defaultTailSide)
      && this.doesHeadConsumeOutput(world, state.coordinates, state.endSide);
  }

  private static doesHeadConsumeOutput(
    world: UserWorld,
    coordinates: GridCoordinates,
    side: TransportBeltSide,
  ): boolean {
    const neighborDescriptor = this.resolveNeighborDescriptor(world, coordinates, side);

    if (!neighborDescriptor || !neighborDescriptor.isStraight) {
      return false;
    }

    const [neighborStartSide] = neighborDescriptor.flow;

    return neighborStartSide === getOppositeTransportBeltSide(side);
  }

  private static resolveUniqueIncomingSide(
    world: UserWorld,
    coordinates: GridCoordinates,
    endSide: TransportBeltSide,
  ): TransportBeltSide | null {
    const defaultTailSide = getOppositeTransportBeltSide(endSide);

    if (this.isIncomingFromSide(world, coordinates, defaultTailSide)) {
      return null;
    }

    const [candidateA, candidateB] = PERPENDICULAR_INCOMING_SIDES_BY_END_SIDE[endSide];
    const contributingSides: TransportBeltSide[] = [];

    if (this.isIncomingFromSide(world, coordinates, candidateA)) {
      contributingSides.push(candidateA);
    }

    if (this.isIncomingFromSide(world, coordinates, candidateB)) {
      contributingSides.push(candidateB);
    }

    if (contributingSides.length !== 1) {
      return null;
    }

    return contributingSides[0];
  }

  private static isIncomingFromSide(
    world: UserWorld,
    coordinates: GridCoordinates,
    side: TransportBeltSide,
  ): boolean {
    const neighborDescriptor = this.resolveNeighborDescriptor(world, coordinates, side);

    if (!neighborDescriptor) {
      return false;
    }

    const [, neighborEndSide] = neighborDescriptor.flow;

    return neighborEndSide === getOppositeTransportBeltSide(side);
  }

  private static resolveNeighborDescriptor(
    world: UserWorld,
    coordinates: GridCoordinates,
    side: TransportBeltSide,
  ): TransportBeltVariantDescriptor | null {
    const neighborEntityId = TransportBeltGridQuery.resolveNeighborEntityId(world, coordinates, side);

    if (neighborEntityId === null) {
      return null;
    }

    const neighborBelt = world.require(neighborEntityId, ConveyorBeltComponent);

    return getTransportBeltVariantDescriptor(neighborBelt.variant) ?? null;
  }
}