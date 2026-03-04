import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { createSystem } from "@engine";
import { Engine, fromContext } from "@engine/context";

export const System = createSystem("main:physics-world-sync")({
  system() {
    const engine = fromContext(Engine);
    PhysicsWorldManager.beginFrame(engine.scene.context.worlds);
  },
});
