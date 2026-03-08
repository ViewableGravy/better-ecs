import { canConveyorStoreEntities, ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { GhostPreviewComponent } from "@client/entities/ghost";
import {
  TransportBeltConnectionUtils,
  updateTransportBeltVariant,
} from "@client/entities/transport-belt";
import {
  getTransportBeltFlow,
  getTransportBeltVariantByFlow,
  TRANSPORT_BELT_SIDE_GRID_OFFSETS,
  type TransportBeltSide,
  type TransportBeltVariant,
} from "@client/entities/transport-belt/consts";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import { GridSingleton, type GridCoordinate, type GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

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

const OPPOSITE_SIDE: Readonly<Record<TransportBeltSide, TransportBeltSide>> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
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

    const flow = getTransportBeltFlow(belt.variant);

    if (!flow) {
      return null;
    }

    const [, endSide] = flow;
    const coordinates = this.resolveBeltCoordinates(world, beltEntityId);

    const uniqueIncomingSide = this.resolveUniqueIncomingSide(world, coordinates, endSide);

    if (uniqueIncomingSide === null) {
      return STRAIGHT_VARIANT_BY_END_SIDE[endSide];
    }

    return getTransportBeltVariantByFlow(uniqueIncomingSide, endSide) ?? STRAIGHT_VARIANT_BY_END_SIDE[endSide];
  }

  private static resolveAffectedBeltEntityIds(
    world: UserWorld,
    placedBeltEntityId: TransportBeltEntityId,
  ): TransportBeltEntityId[] {
    const placedCoordinates = this.resolveBeltCoordinates(world, placedBeltEntityId);

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

    const centerBeltEntityIdAtCoordinates = this.findBeltEntityAtCoordinates(world, coordinates);

    if (centerBeltEntityIdAtCoordinates !== null) {
      affected.add(centerBeltEntityIdAtCoordinates);
    }

    for (const side of ["top", "right", "bottom", "left"] as const) {
      const neighborCoordinates = this.offsetCoordinates(coordinates, TRANSPORT_BELT_SIDE_GRID_OFFSETS[side]);
      const neighborEntityId = this.findBeltEntityAtCoordinates(world, neighborCoordinates);

      if (neighborEntityId === null) {
        continue;
      }

      affected.add(neighborEntityId);
    }

    return [...affected];
  }

  private static resolveUniqueIncomingSide(
    world: UserWorld,
    coordinates: GridCoordinates,
    endSide: TransportBeltSide,
  ): TransportBeltSide | null {
    const defaultTailSide = OPPOSITE_SIDE[endSide];

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
    const neighborCoordinates = this.offsetCoordinates(coordinates, TRANSPORT_BELT_SIDE_GRID_OFFSETS[side]);
    const neighborEntityId = this.findBeltEntityAtCoordinates(world, neighborCoordinates);

    if (neighborEntityId === null) {
      return false;
    }

    const neighborBelt = world.get(neighborEntityId, ConveyorBeltComponent);

    const neighborFlow = getTransportBeltFlow(neighborBelt.variant);

    if (!neighborFlow) {
      return false;
    }

    const [, neighborEndSide] = neighborFlow;

    return neighborEndSide === OPPOSITE_SIDE[side];
  }

  private static findBeltEntityAtCoordinates(
    world: UserWorld,
    coordinates: GridCoordinates,
  ): TransportBeltEntityId | null {
    for (const beltEntityId of world.query(ConveyorBeltComponent, Transform2D)) {
      if (world.has(beltEntityId, GhostPreviewComponent)) {
        continue;
      }

      const transform = world.get(beltEntityId, Transform2D);
      const beltCoordinates = GridSingleton.worldToGridCoordinates(transform.curr.pos.x, transform.curr.pos.y);

      if (!GridSingleton.areCoordinatesEqual(beltCoordinates, coordinates)) {
        continue;
      }

      return beltEntityId;
    }

    return null;
  }

  private static resolveBeltCoordinates(
    world: UserWorld,
    beltEntityId: TransportBeltEntityId,
  ): GridCoordinates {
    const transform = world.get(beltEntityId, Transform2D);

    return GridSingleton.worldToGridCoordinates(transform.curr.pos.x, transform.curr.pos.y);
  }

  private static offsetCoordinates(
    coordinates: GridCoordinates,
    offset: readonly [x: number, y: number],
  ): GridCoordinates {
    return [
      (Number(coordinates[0]) + offset[0]) as GridCoordinate,
      (Number(coordinates[1]) + offset[1]) as GridCoordinate,
    ];
  }
}