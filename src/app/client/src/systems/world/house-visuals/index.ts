import { createSystem } from "@engine";
import { Delta, Engine, fromContext, World } from "@engine/context";
import { SpatialContexts } from "@libs/spatial-contexts";

import { applyHouseVisuals, syncContextTransitionVisuals } from "./utilities";

export const System = createSystem("main:house-visuals")({
  system() {
    const world = fromContext(World);
    const engine = fromContext(Engine);
    const [updateDelta] = fromContext(Delta);
    const manager = SpatialContexts.getManager(engine.scene.context);
    if (!manager) {
      return;
    }

    syncContextTransitionVisuals(manager, updateDelta);
    applyHouseVisuals(world, manager);
  },
});
