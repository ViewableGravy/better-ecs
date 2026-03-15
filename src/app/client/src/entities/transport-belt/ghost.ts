import { GhostPreviewComponent } from "@client/entities/ghost/component";
import { createGhostPreset } from "@client/entities/ghost/spawner";
import {
    spawnTransportBelt,
    updateTransportBeltVariant,
    type TransportBeltVariant,
} from "@client/entities/transport-belt";
import {
    TRANSPORT_BELT_OFFSET_X,
    TRANSPORT_BELT_OFFSET_Y,
} from "@client/systems/world/build-mode/metrics";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const DEFAULT_TRANSPORT_BELT_GHOST_VARIANT: TransportBeltVariant = "horizontal-right";

export const TransportBeltGhost = createGhostPreset<TransportBeltVariant>({
  kind: "transport-belt",
  spawn(world, x, y, variant) {
    return spawnTransportBelt(world, {
      x: x + TRANSPORT_BELT_OFFSET_X,
      y: y + TRANSPORT_BELT_OFFSET_Y,
      variant: variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT,
      connectToNeighbors: false,
      profile: "preview",
    });
  },
  resolvePreviewVariant(variant) {
    return variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT;
  },
  sync(world, ghostEntityId, variant) {
    const resolvedVariant = variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT;

    updateTransportBeltVariant(world, ghostEntityId, resolvedVariant);

    const ghostPreview = world.require(ghostEntityId, GhostPreviewComponent);
    ghostPreview.previewVariant = resolvedVariant;
  },
});