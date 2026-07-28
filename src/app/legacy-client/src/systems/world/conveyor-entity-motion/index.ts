import { ConveyorBeltComponent } from "@legacy/components/conveyor-belt";
import { TransportBeltLeaf } from "@legacy/components/transport-belt-leaf";
import { ConveyorUtils } from "@legacy/entities/transport-belt";
import { ConveyorEntityMotionUtils } from "@legacy/entities/transport-belt/motion/ConveyorEntityMotionUtils";
import { ConveyorSideLoadUtils } from "@legacy/entities/transport-belt/motion/ConveyorSideLoadUtils";
import type { ConveyorSideLoadTransfer } from "@legacy/entities/transport-belt/motion/types";
import { ConveyorBeltChainIterator } from "@legacy/entities/transport-belt/topology/ConveyorBeltChainIterator";
import type { EntityId } from "@engine";
import { createSystem } from "@engine";
import { fromContext, ActiveRegistry } from "@engine/context";

const beltIterator = new ConveyorBeltChainIterator();
const motionUtils = new ConveyorEntityMotionUtils();
const deferredSideLoads: ConveyorSideLoadTransfer[] = [];
const conveyorsToSync = new Set<EntityId>();

export const System = createSystem("main:conveyor-entity-motion-authority")({
  system() {
    const world = fromContext(ActiveRegistry);
    const tickDelta = 1;

    deferredSideLoads.length = 0;
    conveyorsToSync.clear();

    // Iterate through leaf nodes, and then iterate through the tree from there, processing belts and deferring side loads.
    world.forEach(TransportBeltLeaf, ConveyorBeltComponent, (conveyorEntityId, _, conveyor) => {
      if (!ConveyorUtils.supportsItemAnimation(conveyor.variant)) {
        return;
      }

      beltIterator.setLeaf(world, conveyorEntityId);
      motionUtils.set(world, tickDelta, beltIterator.getInitialNextEntityId());

      for (const beltEntityId of beltIterator.iterate()) {
        motionUtils.advanceConveyorEntity(beltEntityId);
      }

      for (const beltEntityId of beltIterator.iterate()) {
        motionUtils.syncConveyorEntityTransforms(beltEntityId);
      }

      const sideLoadTransfer = ConveyorSideLoadUtils.resolveDeferredTransfer(world, conveyorEntityId);

      if (sideLoadTransfer !== null) {
        deferredSideLoads.push(sideLoadTransfer);
      }
    });

    // Handle deferred side loads after processing main belts
    for (const sideLoadTransfer of deferredSideLoads) {
      if (!ConveyorEntityMotionUtils.transferSideLoad(world, sideLoadTransfer)) {
        continue;
      }

      conveyorsToSync.add(sideLoadTransfer.sourceEntityId);
      conveyorsToSync.add(sideLoadTransfer.targetEntityId);
    }

    // Sync transforms for any conveyors affected by side loads
    for (const conveyorEntityId of conveyorsToSync) {
      const conveyor = world.get(conveyorEntityId, ConveyorBeltComponent);

      if (!conveyor) {
        continue;
      }

      ConveyorEntityMotionUtils.syncConveyorTransforms(world, conveyor);
    }
  },
});
