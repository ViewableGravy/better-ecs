import { createSystem, useEngine } from "@repo/engine";
import z from "zod";
import { getSpatialContextManager } from "./install";

/**
 * Keeps `engine.world` bound to the currently focused context world.
 *
 * Add this system to the engine systems list (like other plugins).
 */
export const SpatialContextsRuntimeSystem = createSystem("plugin:spatial-contexts-runtime")({
  phase: "all",
  priority: 100_000,
  schema: {
    default: {},
    schema: z.object({}),
  },
  system() {
    const engine = useEngine();
    const scene = engine.scene.context;
    if (!scene) return;

    const manager = getSpatialContextManager(scene);
    if (!manager) return;

    const focused = manager.getFocusedContextId();

    // Bind engine active world to focused context.
    // This affects `useWorld()` for all systems.
    engine.scene.setActiveWorld(focused);
  },
});
