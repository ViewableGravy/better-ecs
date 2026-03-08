import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import { ConveyorUtils } from "@client/entities/transport-belt";
import { createSystem } from "@engine";
import { Delta, fromContext, World } from "@engine/context";
import { ConveyorEntityMotionUtils } from "./utils/ConveyorEntityMotionUtils";

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

      ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
        world, 
        conveyorEntityId, 
        updateDelta
      );
    });
  },
});
