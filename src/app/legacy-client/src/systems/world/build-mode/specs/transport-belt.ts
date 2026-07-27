import { ConveyorBeltComponent } from "@legacy/components/conveyor-belt";
import {
    getTransportBeltDirectionFromPlacementSide,
    spawnTransportBelt,
    type TransportBeltVariant,
} from "@legacy/entities/transport-belt";
import { TransportBeltGhost } from "@legacy/entities/transport-belt/ghost";
import { TransportBeltAutoShapeManager } from "@legacy/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { TransportBeltRotationVariantManager } from "@legacy/entities/transport-belt/placement/TransportBeltRotationVariantManager";
import {
    TRANSPORT_BELT_OFFSET_X,
    TRANSPORT_BELT_OFFSET_Y,
} from "@legacy/systems/world/build-mode/metrics";
import { createPlacementSpawner } from "@legacy/systems/world/build-mode/placement/createPlacementSpawner";
import { createGhostPreviewAdapter } from "@legacy/systems/world/build-mode/placement/preview";
import { PlacementQueries } from "@legacy/systems/world/build-mode/placement/queries";
import { createBuildItemSpec } from "@legacy/systems/world/build-mode/placement/spec";
import { COLLISION_LAYERS } from "@libs/physics";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const transportBeltPlacementDefinition = createBuildItemSpec<TransportBeltVariant>({
  item: "transport-belt",
  preview: createGhostPreviewAdapter(TransportBeltGhost),
  dragPlacementMode: "line",
  placement: {
    strategy: {
      queries: ["grid", "overlap"],
      strategy: "replace",
      compatibilityGroup: "transport-belt",
      resolveOccupantCompatibilityGroup(world, occupant) {
        return world.has(occupant.entityId, ConveyorBeltComponent) ? "transport-belt" : null;
      },
      replaceableLayers: COLLISION_LAYERS.CONVEYOR,
    },
  },
  rotationMode: "placement-end-side",
  resolvePayload({ world, gridCoordinates, buildModeState }) {
    return TransportBeltRotationVariantManager.deriveBeltVariant(world, {
      coordinates: gridCoordinates,
      headDirection: getTransportBeltDirectionFromPlacementSide(buildModeState.placementEndSide),
    });
  },
  lifecycle: {
    commit: createPlacementSpawner({
      item: "transport-belt",
      markPlaceable: true,
      resolveSpawnPoint({ snappedX, snappedY }) {
        return {
          placementX: snappedX + TRANSPORT_BELT_OFFSET_X,
          placementY: snappedY + TRANSPORT_BELT_OFFSET_Y,
        };
      },
      replace({ world, placementX, placementY }) {
        PlacementQueries.replaceTransportBeltAt(world, placementX, placementY);
      },
      spawn({ world, placementX, placementY }, variant) {
        return spawnTransportBelt(world, {
          x: placementX,
          y: placementY,
          variant,
        });
      },
      afterSpawn({ world }, beltEntityId) {
        if (beltEntityId === undefined || Array.isArray(beltEntityId)) {
          return;
        }

        TransportBeltAutoShapeManager.refreshAffectedBelts(world, beltEntityId);
      },
    }),
  },
});
