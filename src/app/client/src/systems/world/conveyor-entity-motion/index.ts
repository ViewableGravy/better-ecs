import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/conveyor-utils";
import { DEMO_SLOT_PROGRESS_PER_MILLISECOND } from "@client/systems/world/conveyor-entity-motion/constants";
import { ConveyorEntityMotionUtils } from "@client/systems/world/conveyor-entity-motion/utils";
import { createSystem } from "@engine";
import { Delta, fromContext, World } from "@engine/context";

export const System = createSystem("main:conveyor-entity-motion")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);
    const progressDelta = updateDelta * DEMO_SLOT_PROGRESS_PER_MILLISECOND;

    if (progressDelta <= 0) {
      return;
    }

    for (const conveyorEntityId of world.query(ConveyorBeltComponent)) {
      const conveyor = world.require(conveyorEntityId, ConveyorBeltComponent);

      if (!ConveyorUtils.supportsStraightItemAnimation(conveyor.variant)) {
        continue;
      }

      ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, progressDelta);
    }
  },
});
