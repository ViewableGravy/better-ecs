import { GhostPreviewComponent } from "@legacy/entities/ghost/component";
import { createGhostPreset } from "@legacy/entities/ghost/spawner";
import {
    spawnTransportBelt,
    updateTransportBeltVariant,
    type TransportBeltVariant,
} from "@legacy/entities/transport-belt";
import {
    TRANSPORT_BELT_OFFSET_X,
    TRANSPORT_BELT_OFFSET_Y,
} from "@legacy/systems/world/build-mode/metrics";

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

    world.patch(ghostEntityId, GhostPreviewComponent, (ghostPreview) => {
      ghostPreview.previewVariant = resolvedVariant;
    });
  },
});
