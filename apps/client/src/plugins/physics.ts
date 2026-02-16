import { createPhysics } from "@repo/physics";

const physics = createPhysics({
  debug: {
    keybind: {
      code: "KeyH",
      modifiers: { ctrl: true },
    },
  },
});

const [PhysicsDebugSystem] = physics.systems;
if (!PhysicsDebugSystem) {
  throw new Error("Physics debug system not initialized");
}

export { PhysicsDebugSystem };
