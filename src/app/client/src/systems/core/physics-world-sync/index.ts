import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { createSystem } from "@engine";
import { ActiveRegistry, fromContext } from "@engine/context";

export const System = createSystem("main:physics-world-sync")({
  system() {
    PhysicsWorldManager.beginFrame([fromContext(ActiveRegistry)]);
  },
});
