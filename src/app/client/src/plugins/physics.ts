import { createPhysics } from "@libs/physics";

const physics = createPhysics({
  debug: {
    keybind: {
      code: "KeyH",
      modifiers: { alt: true },
    },
  },
});

export const [PhysicsDebugSystem] = physics.systems;
