import { createPhysics } from "@repo/physics";

const physics = createPhysics({
  debug: {
    keybind: {
      code: "KeyH",
      modifiers: { ctrl: true },
    },
  },
});

export const PhysicsDebugSystem = physics.systems[0]!;
