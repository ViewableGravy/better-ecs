import { GhostPreviewComponent } from "@client/entities/ghost/component";
import { createEntityGhostPreset } from "@client/entities/ghost/spawner";
import {
  spawnTransportBelt,
  updateTransportBeltVariant,
  type TransportBeltVariant,
} from "@client/entities/transport-belt";
import { asTransportBeltEntityId } from "@client/entities/transport-belt/types";
import {
  TRANSPORT_BELT_OFFSET_X,
  TRANSPORT_BELT_OFFSET_Y,
} from "@client/systems/world/build-mode/metrics";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const DEFAULT_TRANSPORT_BELT_GHOST_VARIANT: TransportBeltVariant = "horizontal-right";

export const TransportBeltGhost = createEntityGhostPreset<TransportBeltVariant>({
  kind: "transport-belt",
  spawn(world, x, y, variant) {
    const resolvedVariant = variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT;

    return spawnTransportBelt(world, {
      x: x + TRANSPORT_BELT_OFFSET_X,
      y: y + TRANSPORT_BELT_OFFSET_Y,
      variant: resolvedVariant,
      connectToNeighbors: false,
    });
  },
  resolvePreviewVariant(variant) {
    return variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT;
  },
  sync(world, ghostEntityId, variant) {
    const resolvedVariant = variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT;
    const beltEntityId = asTransportBeltEntityId(ghostEntityId);

    updateTransportBeltVariant(world, beltEntityId, resolvedVariant);

    const ghostPreview = world.require(beltEntityId, GhostPreviewComponent);
    ghostPreview.previewVariant = resolvedVariant;
  },
});