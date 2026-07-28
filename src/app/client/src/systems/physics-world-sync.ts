import { PhysicsWorldManager } from "@client/physics/physics-world-manager";
import { createSystem } from "@engine";
import { ActiveRegistry, fromContext } from "@engine/context";

export const PhysicsWorldSync = createSystem("main:physics-world-sync")({
  system() {
    PhysicsWorldManager.beginFrame(fromContext(ActiveRegistry));
  },
});
