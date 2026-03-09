import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import { ConveyorUtils } from "@client/entities/transport-belt";
import type { EntityId } from "@engine";
import { createSystem } from "@engine";
import { Delta, fromContext, World } from "@engine/context";
import { ConveyorBeltChainIterator, ConveyorEntityMotionUtils, ConveyorSideLoadUtils } from "./utils";
import type { ConveyorSideLoadTransfer } from "./utils/types";

const beltIterator = new ConveyorBeltChainIterator();
const motionUtils = new ConveyorEntityMotionUtils();
const deferredSideLoads: ConveyorSideLoadTransfer[] = [];
const conveyorsToSync = new Set<EntityId>();

export const System = createSystem("main:conveyor-entity-motion")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);

    if (updateDelta <= 0) {
      return;
    }

    deferredSideLoads.length = 0;
    conveyorsToSync.clear();

    // Iterate through leaf nodes, and then iterate through the tree from there, processing belts and deferring side loads.
    world.forEach2(TransportBeltLeaf, ConveyorBeltComponent, (conveyorEntityId, _, conveyor) => {
      if (!ConveyorUtils.supportsItemAnimation(conveyor.variant)) {
        return;
      }

      beltIterator.setLeaf(world, conveyorEntityId);
      motionUtils.set(world, updateDelta, beltIterator.getInitialNextEntityId());

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
