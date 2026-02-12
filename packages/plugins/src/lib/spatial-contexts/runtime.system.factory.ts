import { createSystem, useEngine, useScene } from "@repo/engine";
import z from "zod";
import { installSpatialContexts } from "./install";

/**
 * Creates a scene-scoped runtime system that binds `engine.world` to the focused context.
 */
export function createSpatialContextsRuntimeSystem(sceneName: string) {
  return createSystem(`plugin:spatial-contexts-runtime:${sceneName}`)({
    phase: "all",
    priority: 100_000,
    schema: {
      default: {},
      schema: z.object({}),
    },
    system() {
      const engine = useEngine();
      const scene = useScene();
      const manager = installSpatialContexts(scene);
      const focused = manager.getFocusedContextId();
      engine.scene.setActiveWorld(focused);
    },
  });
}
