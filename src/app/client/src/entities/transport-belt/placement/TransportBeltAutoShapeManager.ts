import { canConveyorStoreEntities, ConveyorBeltComponent } from "@client/components/conveyor-belt";
import {
    TransportBeltConnectionUtils,
    updateTransportBeltVariant,
} from "@client/entities/transport-belt";
import { getTransportBeltVariantByFlow, type TransportBeltSide, type TransportBeltVariant } from "@client/entities/transport-belt/consts";
import {
    getOppositeTransportBeltSide,
    getTransportBeltVariantDescriptor,
    isStraightTransportBeltFlow,
    TransportBeltGridQuery,
} from "@client/entities/transport-belt/core";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type NeighborCandidate = readonly [sideA: TransportBeltSide, sideB: TransportBeltSide];

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

export class TransportBeltAutoShapeManager {
  public static refreshAffectedBelts(world: UserWorld, placedBeltEntityId: TransportBeltEntityId): void {
    const affectedBeltEntityIds = this.resolveAffectedBeltEntityIds(world, placedBeltEntityId);

    this.refreshBeltEntityIds(world, affectedBeltEntityIds);
  }

  public static refreshBeltsNearCoordinates(world: UserWorld, coordinates: GridCoordinates): void {
    const affectedBeltEntityIds = this.resolveBeltEntityIdsAroundCoordinates(world, coordinates);

    this.refreshBeltEntityIds(world, affectedBeltEntityIds);
  }

  private static refreshBeltEntityIds(
    world: UserWorld,
    affectedBeltEntityIds: TransportBeltEntityId[],
  ): void {
    if (affectedBeltEntityIds.length === 0) {
      return;
    }

    for (const beltEntityId of affectedBeltEntityIds) {
      const resolvedVariant = this.resolveVariant(world, beltEntityId);

      if (!resolvedVariant) {
        continue;
      }

      updateTransportBeltVariant(world, beltEntityId, resolvedVariant);
    }

    for (const beltEntityId of affectedBeltEntityIds) {
      TransportBeltConnectionUtils.reconnectBelt(world, beltEntityId);
    }
  }

  public static resolveVariant(world: UserWorld, beltEntityId: TransportBeltEntityId): TransportBeltVariant | null {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!canConveyorStoreEntities(belt.variant)) {
      return null;
    }

    const descriptor = getTransportBeltVariantDescriptor(belt.variant);

    if (!descriptor) {
      return null;
    }

    const [startSide, endSide] = descriptor.flow;
    const coordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, beltEntityId);
    const straightThroughVariant = this.resolveStraightThroughVariant(world, endSide, coordinates);

    if (straightThroughVariant !== null) {
      return straightThroughVariant;
    }

    if (this.isIncomingFromSide(world, coordinates, startSide)) {
      return belt.variant as TransportBeltVariant;
    }

    const uniqueIncomingSide = this.resolveUniqueIncomingSide(world, coordinates, endSide);

    if (uniqueIncomingSide === null) {
      return STRAIGHT_VARIANT_BY_END_SIDE[endSide];
    }

    return getTransportBeltVariantByFlow(uniqueIncomingSide, endSide) ?? STRAIGHT_VARIANT_BY_END_SIDE[endSide];
  }

  private static resolveStraightThroughVariant(
    world: UserWorld,
    endSide: TransportBeltSide,
    coordinates: GridCoordinates,
  ): TransportBeltVariant | null {
    const defaultTailSide = getOppositeTransportBeltSide(endSide);

    if (this.isStraightIncomingFromSide(world, coordinates, defaultTailSide)
      && this.isStraightOutgoingToSide(world, coordinates, endSide)) {
      return STRAIGHT_VARIANT_BY_END_SIDE[endSide];
    }

    return null;
  }

  private static isStraightIncomingFromSide(
    world: UserWorld,
    coordinates: GridCoordinates,
    side: TransportBeltSide,
  ): boolean {
    const neighborDescriptor = this.resolveNeighborDescriptor(world, coordinates, side);

    if (!neighborDescriptor || !isStraightTransportBeltFlow(neighborDescriptor.flow)) {
      return false;
    }

    const [, neighborEndSide] = neighborDescriptor.flow;

    return neighborEndSide === getOppositeTransportBeltSide(side);
  }

  private static isStraightOutgoingToSide(
    world: UserWorld,
    coordinates: GridCoordinates,
    side: TransportBeltSide,
  ): boolean {
    const neighborDescriptor = this.resolveNeighborDescriptor(world, coordinates, side);

    if (!neighborDescriptor || !isStraightTransportBeltFlow(neighborDescriptor.flow)) {
      return false;
    }

    const [neighborStartSide] = neighborDescriptor.flow;

    return neighborStartSide === getOppositeTransportBeltSide(side);
  }

  private static resolveAffectedBeltEntityIds(
    world: UserWorld,
    placedBeltEntityId: TransportBeltEntityId,
  ): TransportBeltEntityId[] {
    const placedCoordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, placedBeltEntityId);

    return this.resolveBeltEntityIdsAroundCoordinates(world, placedCoordinates, placedBeltEntityId);
  }

  private static resolveBeltEntityIdsAroundCoordinates(
    world: UserWorld,
    coordinates: GridCoordinates,
    centerBeltEntityId?: TransportBeltEntityId,
  ): TransportBeltEntityId[] {
    const affected = new Set<TransportBeltEntityId>();

    if (centerBeltEntityId !== undefined) {
      affected.add(centerBeltEntityId);
    }

    const centerBeltEntityIdAtCoordinates = TransportBeltGridQuery.findBeltEntityAtCoordinates(world, coordinates);

    if (centerBeltEntityIdAtCoordinates !== null) {
      affected.add(centerBeltEntityIdAtCoordinates as TransportBeltEntityId);
    }

    for (const side of ["top", "right", "bottom", "left"] as const) {
      const neighborEntityId = TransportBeltGridQuery.resolveNeighborEntityId(world, coordinates, side);

      if (neighborEntityId === null) {
        continue;
      }

      affected.add(neighborEntityId as TransportBeltEntityId);
    }

    return [...affected];
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
  ) {
    const neighborEntityId = TransportBeltGridQuery.resolveNeighborEntityId(world, coordinates, side);

    if (neighborEntityId === null) {
      return null;
    }

    const neighborBelt = world.require(neighborEntityId, ConveyorBeltComponent);

    return getTransportBeltVariantDescriptor(neighborBelt.variant) ?? null;
  }
}
