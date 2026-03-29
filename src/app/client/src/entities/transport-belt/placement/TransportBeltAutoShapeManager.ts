import { ConveyorBeltComponent, syncConveyorBeltDirectionsFromVariant } from "@client/components/conveyor-belt";
import {
    TRANSPORT_BELT_DIRECTIONS,
    TransportBeltConnectionUtils,
    updateTransportBeltVariant,
} from "@client/entities/transport-belt";
import { TransportBeltGridQuery } from "@client/entities/transport-belt/core";
import { TransportBeltRotationVariantManager } from "@client/entities/transport-belt/placement/TransportBeltRotationVariantManager";
import { TransportBeltTerminalDecorationManager } from "@client/entities/transport-belt/placement/TransportBeltTerminalDecorationManager";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const MAX_REFRESH_PASSES = 4;

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

    for (let pass = 0; pass < MAX_REFRESH_PASSES; pass += 1) {
      let didChangeVariant = false;

      for (const beltEntityId of affectedBeltEntityIds) {
        const resolvedFlow = TransportBeltRotationVariantManager.deriveBeltFlow(world, { beltEntityId });

        if (!resolvedFlow) {
          continue;
        }

        const resolvedVariant = TransportBeltRotationVariantManager.deriveBeltVariant(world, { beltEntityId });

        if (!resolvedVariant) {
          continue;
        }

        const belt = world.require(beltEntityId, ConveyorBeltComponent);

        if (
          belt.variant === resolvedVariant
          && belt.tailDirection === resolvedFlow[0]
          && belt.headDirection === resolvedFlow[1]
        ) {
          continue;
        }

        belt.tailDirection = resolvedFlow[0];
        belt.headDirection = resolvedFlow[1];
        updateTransportBeltVariant(world, beltEntityId, resolvedVariant);
        didChangeVariant = true;
      }

      if (!didChangeVariant) {
        break;
      }
    }

    for (const beltEntityId of affectedBeltEntityIds) {
      TransportBeltConnectionUtils.reconnectBelt(world, beltEntityId);
    }

    TransportBeltTerminalDecorationManager.syncBelts(world, affectedBeltEntityIds);
  }

  private static resolveAffectedBeltEntityIds(
    world: UserWorld,
    placedBeltEntityId: TransportBeltEntityId,
  ): TransportBeltEntityId[] {
    const placedCoordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, placedBeltEntityId);
    const placedBelt = world.require(placedBeltEntityId, ConveyorBeltComponent);

    syncConveyorBeltDirectionsFromVariant(placedBelt);

    const affected = new Set<TransportBeltEntityId>([placedBeltEntityId]);
    const headNeighborEntityId = TransportBeltGridQuery.resolveNeighborEntityIdInDirection(
      world,
      placedCoordinates,
      placedBelt.headDirection,
    );
    const tailNeighborEntityId = TransportBeltGridQuery.resolveNeighborEntityIdInDirection(
      world,
      placedCoordinates,
      placedBelt.tailDirection,
    );

    if (headNeighborEntityId !== null) {
      affected.add(headNeighborEntityId as TransportBeltEntityId);
    }

    if (tailNeighborEntityId !== null) {
      affected.add(tailNeighborEntityId as TransportBeltEntityId);
    }

    return [...affected];
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

    for (const direction of TRANSPORT_BELT_DIRECTIONS) {
      const neighborEntityId = TransportBeltGridQuery.resolveNeighborEntityIdInDirection(world, coordinates, direction);

      if (neighborEntityId === null) {
        continue;
      }

      affected.add(neighborEntityId as TransportBeltEntityId);
    }

    return [...affected];
  }
}
