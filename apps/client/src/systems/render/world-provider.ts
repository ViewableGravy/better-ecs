import { PlayerComponent } from "@/components/player";
import { InsideContext } from "@/scenes/spatial-contexts-demo/components/inside-context";
import { useEngine, useWorld, type UserWorld, type WorldProvider } from "@repo/engine";
import { getManager, type SpatialContextManager } from "@repo/spatial-contexts";

export class ActiveWorldProvider implements WorldProvider {
  getVisibleWorlds(): readonly UserWorld[] {
    const manager = getManager(useEngine().scene.context);

    if (!manager) {
      return [useWorld()];
    }

    const visibleWorlds = [...manager.getVisibleWorlds()];
    const transitionWorld = ActiveWorldProvider.getTransitionWorld(manager);

    if (!transitionWorld || visibleWorlds.includes(transitionWorld)) {
      return visibleWorlds;
    }

    visibleWorlds.push(transitionWorld);
    return visibleWorlds;
  }

  private static getTransitionWorld(manager: SpatialContextManager): UserWorld | undefined {
    const rootContextId = manager.rootContextId;
    if (manager.focusedContextId !== rootContextId) {
      return undefined;
    }

    const rootWorld = manager.getWorld(rootContextId);
    if (!rootWorld) {
      return undefined;
    }

    const [playerId] = rootWorld.query(PlayerComponent);
    if (!playerId) {
      return undefined;
    }

    const insideContext = rootWorld.get(playerId, InsideContext);
    if (!insideContext) {
      return undefined;
    }

    return manager.getWorld(insideContext.contextId);
  }
}
