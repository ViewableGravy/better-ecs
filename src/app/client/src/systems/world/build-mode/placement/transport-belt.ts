import {
  spawnTransportBelt,
  type TransportBeltVariant,
} from "@client/entities/transport-belt";
import { TransportBeltGhost } from "@client/entities/transport-belt/ghost";
import { TransportBeltAutoShapeManager } from "@client/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { TransportBeltPlacementRotationManager } from "@client/entities/transport-belt/placement/TransportBeltPlacementRotationManager";
import {
  TRANSPORT_BELT_OFFSET_X,
  TRANSPORT_BELT_OFFSET_Y,
} from "@client/systems/world/build-mode/metrics";
import { createPlacementDefinition } from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import { createPlacementSpawner } from "@client/systems/world/build-mode/placement/createPlacementSpawner";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";
import { COLLISION_LAYERS } from "@libs/physics";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const transportBeltPlacementDefinition = createPlacementDefinition<TransportBeltVariant>({
  item: "transport-belt",
  ghost: TransportBeltGhost,
  dragPlacementMode: "line",
  placementStrategy: {
    query: "grid",
    strategy: "replace",
    replaceableLayers: COLLISION_LAYERS.CONVEYOR,
  },
  rotationMode: "placement-end-side",
  resolvePayload({ world, gridCoordinates, buildModeState }) {
    return TransportBeltPlacementRotationManager.resolveVariant(
      world,
      gridCoordinates,
      buildModeState.placementEndSide,
    );
  },
  spawn: createPlacementSpawner({
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
});
