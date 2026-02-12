import { createSystem, useScene } from "@repo/engine";

/**
 * Minimal example of a scene-level system.
 *
 * This runs only while the scene that registers it is active.
 */
export const System = createSystem("client:scene-demo")({
  phase: "update",
  system() {
    const scene = useScene();

    // Demonstrate access to scene metadata without producing console noise.
    void scene.name;
  },
});
