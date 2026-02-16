import type { UserWorld } from "@repo/engine";
import { useScene } from "@repo/engine";
import type { ContextId } from "./context-id";
import { getManager } from "./install";
import type { SpatialContextManager } from "./manager";

export function useContextManager(): SpatialContextManager {
  const scene = useScene();
  const manager = getManager(scene);
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
  return useContextManager().getRootWorld();
}

export function useContextWorld(id: ContextId): UserWorld {
  return useContextManager().getWorldOrThrow(id);
}
