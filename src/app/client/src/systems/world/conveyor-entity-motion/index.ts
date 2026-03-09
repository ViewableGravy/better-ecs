import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import { ConveyorUtils } from "@client/entities/transport-belt";
import { createSystem } from "@engine";
import { Delta, fromContext, World } from "@engine/context";
import { ConveyorBeltChainIterator, ConveyorEntityMotionUtils } from "./utils";

const beltIterator = new ConveyorBeltChainIterator();
const motionUtils = new ConveyorEntityMotionUtils();

export const System = createSystem("main:conveyor-entity-motion")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);

    if (updateDelta <= 0) {
      return;
    }

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
    });
  },
});
