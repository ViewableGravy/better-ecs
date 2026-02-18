import { createSystem, useEngine, useScene } from "@repo/engine";
import { SpatialContexts } from "./install";

/**
 * Creates a scene-scoped runtime system that binds `engine.world` to the focused context.
 */
export function createSpatialContextsRuntimeSystem<const TSceneName extends string>(
  sceneName: TSceneName,
) {
  return createSystem(`plugin:spatial-contexts-runtime:${sceneName}`)({
    priority: 100_000,
    system() {
      const engine = useEngine();
      const scene = useScene();
      const manager = SpatialContexts.install(scene);
      manager.setActiveWorldController(engine.scene);

      const focused = manager.focusedContextId;
      if (engine.scene.activeWorldId !== focused) {
        engine.scene.setActiveWorld(focused);
      }
    },
  });
}
