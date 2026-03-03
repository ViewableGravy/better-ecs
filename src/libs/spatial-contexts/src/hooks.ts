import type { UserWorld } from "@engine";
import { fromContext, Scene } from "@engine/context";
import type { ContextId } from "@libs/spatial-contexts/context-id";
import { SpatialContexts } from "@libs/spatial-contexts/install";
import type { SpatialContextManager } from "@libs/spatial-contexts/manager";

export function useContextManager(): SpatialContextManager {
  const scene = fromContext(Scene);
  const manager = SpatialContexts.getManager(scene);
  if (!manager) {
    throw new Error(
      "Spatial contexts not installed for active scene. Use createContextScene(...) or call installSpatialContexts(scene) in sceneSetup().",
    );
  }

  return manager;
}

export function useFocusedContextId(): ContextId {
  return useContextManager().focusedContextId;
}

export function useFocusedContextWorld(): UserWorld {
  return useContextManager().focusedWorld;
}

export function useRootContextWorld(): UserWorld {
  return useContextManager().rootWorld;
}

export function useContextWorld(id: ContextId): UserWorld {
  return useContextManager().requireWorld(id);
}
