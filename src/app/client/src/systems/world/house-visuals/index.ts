import { createSystem } from "@engine";
import { Engine, fromContext, World } from "@engine/context";
import { SpatialContexts } from "@libs/spatial-contexts";

import { applyHouseVisuals } from "./utilities";

export const System = createSystem("main:house-visuals")({
  system() {
    const world = fromContext(World);
    const engine = fromContext(Engine);
    const manager = SpatialContexts.getManager(engine.scene.context);
    if (!manager) {
      return;
    }

    applyHouseVisuals(world, manager);
  },
});
