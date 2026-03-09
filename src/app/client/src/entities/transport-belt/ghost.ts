import { GhostPreviewComponent, applyGhostEffect, type GhostPreset } from "@client/entities/ghost";
import {
  spawnTransportBelt,
  updateTransportBeltVariant,
  type TransportBeltVariant,
} from "@client/entities/transport-belt";
import { asTransportBeltEntityId } from "@client/entities/transport-belt/types";
import {
  TRANSPORT_BELT_OFFSET_X,
  TRANSPORT_BELT_OFFSET_Y,
} from "@client/systems/world/build-mode/const";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const DEFAULT_TRANSPORT_BELT_GHOST_VARIANT: TransportBeltVariant = "horizontal-right";

export const TransportBeltGhost: GhostPreset<TransportBeltVariant> = {
  kind: "transport-belt",
  spawn(world, x, y, variant) {
    const resolvedVariant = variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT;
    const beltEntityId = spawnTransportBelt(world, {
      x: x + TRANSPORT_BELT_OFFSET_X,
      y: y + TRANSPORT_BELT_OFFSET_Y,
      variant: resolvedVariant,
      connectToNeighbors: false,
    });

    return applyGhostEffect(world, beltEntityId, this.kind, resolvedVariant);
  },
  sync(world, ghostEntityId, variant) {
    const resolvedVariant = variant ?? DEFAULT_TRANSPORT_BELT_GHOST_VARIANT;
    const beltEntityId = asTransportBeltEntityId(ghostEntityId);

    updateTransportBeltVariant(world, beltEntityId, resolvedVariant);

    const ghostPreview = world.require(beltEntityId, GhostPreviewComponent);
    ghostPreview.transportBeltVariant = resolvedVariant;
  },
};