import { InsideContext } from "@client/components/inside-context";
import { PlayerComponent } from "@client/components/player";
import {
    findContainingContextRegion,
    findRegionByContextId,
    isInsideContextRegion,
} from "@client/scenes/world/utilities/context-collision";
import {
    createSystem,
    type EntityId,
    type UserWorld,
} from "@engine";
import { Transform2D } from "@engine/components";
import { fromContext, World } from "@engine/context";
import { ContextEntryRegion, type ContextId, useContextManager } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   SYSTEM START
 **********************************************************************************************************/
export const System = createSystem("main:context-focus-authority")({
  system() {
    const manager = useContextManager();
    const world = fromContext(World);
    const [playerId] = world.invariantQuery(PlayerComponent);
    const playerTransform = world.require(playerId, Transform2D);
    const focused = manager.focusedContextId;
    
    if (manager.isRootFocused) {
      const region = findContainingContextRegion(world, playerTransform);

      if (region) {
        setInsideContext(world, playerId, region.contextId, region.regionEntityId);
        switchContext(manager, world, playerId, region.contextId);
        return;
      }

      return;
    }

    const definition = manager.listDefinitions().find((item) => item.id === focused);
    if (!definition?.parentId) {
      return world.remove(playerId, InsideContext);
    }

    const parentWorld = manager.getWorld(definition.parentId);
    if (!parentWorld) {
      return world.remove(playerId, InsideContext);
    }

    const sourceRegion = findRegionByContextId(parentWorld, focused);
    if (!sourceRegion) {
      return world.remove(playerId, InsideContext);
    }

    const sourceRegionBounds = parentWorld.get(sourceRegion.regionEntityId, ContextEntryRegion);
    if (!sourceRegionBounds) {
      return world.remove(playerId, InsideContext);
    }

    const isInsideSourceRegion = isInsideContextRegion(playerTransform, sourceRegionBounds);
    if (isInsideSourceRegion) {
      setInsideContext(world, playerId, focused, sourceRegion.regionEntityId);
      return;
    }

    switchContext(manager, world, playerId, definition.parentId);
  },
});

function switchContext(
  manager: ReturnType<typeof useContextManager>,
  sourceWorld: UserWorld,
  sourcePlayerId: EntityId,
  next: ContextId,
): void {
  const target = manager.requireWorld(next);

  sourceWorld.move(sourcePlayerId, target);

  manager.setFocusedContextId(next);
}

function setInsideContext(
  world: UserWorld,
  playerId: EntityId,
  contextId: ContextId,
  sourceRegionEntity: EntityId,
): void {
  const insideContext = world.get(playerId, InsideContext);

  if (insideContext) {
    insideContext.contextId = contextId;
    insideContext.sourceRegionEntity = sourceRegionEntity;
  } else {
    world.add(playerId, new InsideContext(contextId, sourceRegionEntity));
  }
}
