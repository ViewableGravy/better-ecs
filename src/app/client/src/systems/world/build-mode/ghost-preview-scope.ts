import { GhostPreview } from "@client/systems/world/build-mode/components";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostPreviewScopeUtils {
  public static pruneGhosts(
    rootWorld: UserWorld,
    focusedWorld: UserWorld,
    sceneWorlds: Iterable<UserWorld>,
  ): void {
    for (const sceneWorld of sceneWorlds) {
      if (sceneWorld !== focusedWorld) {
        sceneWorld.destroy(GhostPreview);
      }
    }

    if (rootWorld !== focusedWorld) {
      rootWorld.destroy(GhostPreview);
    }
  }
}