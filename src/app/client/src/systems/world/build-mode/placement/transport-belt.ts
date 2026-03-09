import { LandClaimQuery } from "@client/entities/land-claim";
import {
    spawnTransportBelt,
    type TransportBeltVariant,
} from "@client/entities/transport-belt";
import { TransportBeltGhost } from "@client/entities/transport-belt/ghost";
import { TransportBeltAutoShapeManager } from "@client/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { TransportBeltPlacementRotationManager } from "@client/entities/transport-belt/placement/TransportBeltPlacementRotationManager";
import { Placeable } from "@client/systems/world/build-mode/components";
import {
    TRANSPORT_BELT_OFFSET_X,
    TRANSPORT_BELT_OFFSET_Y,
} from "@client/systems/world/build-mode/const";
import { createPlacementDefinition } from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";
import { COLLISION_LAYERS, inLayer } from "@libs/physics";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const transportBeltPlacementDefinition = createPlacementDefinition<TransportBeltVariant>({
  item: "transport-belt",
  ghost: TransportBeltGhost,
  resolvePayload({ world, gridCoordinates, buildModeState }) {
    return TransportBeltPlacementRotationManager.resolveVariant(
      world,
      gridCoordinates,
      buildModeState.placementEndSide,
    );
  },
  canPlace({ world, gridCoordinates }) {
    if (!LandClaimQuery.isWithinBuildableArea(world, gridCoordinates)) {
      return false;
    }

    const overlaps = PlacementQueries.queryPlacementOccupantsByGrid(world, gridCoordinates);

    for (const overlap of overlaps) {
      if (inLayer(overlap.participation.layers, COLLISION_LAYERS.CONVEYOR)) {
        continue;
      }

      return false;
    }

    return true;
  },
  spawn({ world, snappedX, snappedY }, variant) {
    const beltX = snappedX + TRANSPORT_BELT_OFFSET_X;
    const beltY = snappedY + TRANSPORT_BELT_OFFSET_Y;

    PlacementQueries.replaceTransportBeltAt(world, beltX, beltY);

    const beltEntityId = spawnTransportBelt(world, {
      x: beltX,
      y: beltY,
      variant,
    });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, beltEntityId);
    world.add(beltEntityId, new Placeable("transport-belt"));
  },
});
