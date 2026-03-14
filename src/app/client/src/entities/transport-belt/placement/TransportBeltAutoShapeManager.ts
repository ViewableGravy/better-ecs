import {
    TransportBeltConnectionUtils,
    updateTransportBeltVariant,
} from "@client/entities/transport-belt";
import { TransportBeltGridQuery } from "@client/entities/transport-belt/core";
import { TransportBeltRotationVariantManager } from "@client/entities/transport-belt/placement/TransportBeltRotationVariantManager";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

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
      const resolvedVariant = TransportBeltRotationVariantManager.deriveBeltVariant(world, { beltEntityId });

      if (!resolvedVariant) {
        continue;
      }

      updateTransportBeltVariant(world, beltEntityId, resolvedVariant);
    }

    for (const beltEntityId of affectedBeltEntityIds) {
      TransportBeltConnectionUtils.reconnectBelt(world, beltEntityId);
    }
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
}
