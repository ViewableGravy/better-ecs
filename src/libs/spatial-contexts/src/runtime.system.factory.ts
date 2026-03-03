import { createSystem } from "@engine";
import { fromContext, Engine, Scene } from "@engine/context";
import { SpatialContexts } from "@libs/spatial-contexts/install";

/**
 * Creates a scene-scoped runtime system that binds `engine.world` to the focused context.
 */
export function createSpatialContextsRuntimeSystem<const TSceneName extends string>(
  sceneName: TSceneName,
) {
  return createSystem(`plugin:spatial-contexts-runtime:${sceneName}`)({
    priority: 100_000,
    system() {
      const engine = fromContext(Engine);
      const scene = fromContext(Scene);
      const manager = SpatialContexts.install(scene);
      manager.setActiveWorldController(engine.scene);

      const focused = manager.focusedContextId;
      if (engine.scene.activeWorldId !== focused) {
        engine.scene.setActiveWorld(focused);
      }
    },
  });
}
