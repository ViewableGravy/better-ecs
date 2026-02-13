import type { UserWorld } from "@repo/engine";
import { useScene } from "@repo/engine";
import type { ContextId } from "./context-id";
import { getSpatialContextManager } from "./install";
import type { SpatialContextManager } from "./manager";

export function useContextManager(): SpatialContextManager {
  const scene = useScene();
  const manager = getSpatialContextManager(scene);
  if (!manager) {
    throw new Error(
      "Spatial contexts not installed for active scene. Use createContextScene(...) or call installSpatialContexts(scene) in sceneSetup().",
    );
  }

  return manager;
}

export function useFocusedContextId(): ContextId {
  return useContextManager().getFocusedContextId();
}

export function useContextWorld(id: ContextId): UserWorld {
  return useContextManager().getWorldOrThrow(id);
}
