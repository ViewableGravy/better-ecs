import { PlayerComponent } from "@client/components/player";
import { InsideContext } from "@client/scenes/world/components/inside-context";
import { type UserWorld, type WorldProvider } from "@engine";
import { fromContext, Engine, World } from "@engine/context";
import { SpatialContexts, type SpatialContextManager } from "@libs/spatial-contexts";

export class ActiveWorldProvider implements WorldProvider {
  getVisibleWorlds(): readonly UserWorld[] {
    const manager = SpatialContexts.getManager(fromContext(Engine).scene.context);

    if (!manager) {
      return [fromContext(World)];
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
