import { PlayerComponent } from "@/components/player";
import { createSystem, type EntityId, useDelta, useEngine, useWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { ContextEntryRegion, type ContextId, useContextManager } from "@repo/spatial-contexts";
import { InsideContext } from "../components/inside-context";
import {
  findContainingContextRegion,
  findRegionByContextId,
  isInsideContextRegion,
} from "../utilities/context-collision";
import {
  isHouseBlendOutsideComplete,
  setHouseInsideTarget,
  tickHouseTransition,
} from "./house-transition.state";

export const HouseContextSystem = createSystem("main:context-focus")({
  system() {
    const manager = useContextManager();
    const world = useWorld();
    const [updateDelta] = useDelta();
    const rootContextId = manager.rootContextId;

    tickHouseTransition(updateDelta);

    const [playerId] = world.query(PlayerComponent);
    if (!playerId) return;

    const transform = world.get(playerId, Transform2D);
    if (!transform) return;

    const focused = manager.focusedContextId;
    if (focused === rootContextId) {
      const region = findContainingContextRegion(world, transform);
      if (!region) {
        setHouseInsideTarget(false);
        if (isHouseBlendOutsideComplete()) {
          world.remove(playerId, InsideContext);
        }
        return;
      }

      setInsideContext(world, playerId, region.contextId, region.regionEntityId);
      setHouseInsideTarget(true);
      switchContext(manager, world, playerId, region.contextId);
      return;
    }

    const definition = manager.listDefinitions().find((item) => item.id === focused);
    if (!definition?.parentId) {
      world.remove(playerId, InsideContext)
      setHouseInsideTarget(false);
      return;
    }

    const parentWorld = manager.getWorld(definition.parentId);
    if (!parentWorld) {
      world.remove(playerId, InsideContext)
      setHouseInsideTarget(false);
      return;
    }

    const sourceRegion = findRegionByContextId(parentWorld, focused);
    if (!sourceRegion) {
      world.remove(playerId, InsideContext)
      setHouseInsideTarget(false);
      return;
    }

    const sourceRegionBounds = parentWorld.get(sourceRegion.regionEntityId, ContextEntryRegion);
    if (!sourceRegionBounds) {
      world.remove(playerId, InsideContext)
      setHouseInsideTarget(false);
      return;
    }

    const isInsideSourceRegion = isInsideContextRegion(transform, sourceRegionBounds);
    if (isInsideSourceRegion) {
      setInsideContext(world, playerId, focused, sourceRegion.regionEntityId);
      setHouseInsideTarget(true);
      return;
    }

    setHouseInsideTarget(false);
    switchContext(manager, world, playerId, definition.parentId);
  },
});

function switchContext(
  manager: ReturnType<typeof useContextManager>,
  sourceWorld: ReturnType<typeof useWorld>,
  sourcePlayerId: EntityId,
  next: ContextId,
): void {
  const engine = useEngine();
  const target = manager.requireWorld(next);

  const [targetPlayerId] = target.query(PlayerComponent);
  if (targetPlayerId && targetPlayerId !== sourcePlayerId) {
    target.destroy(targetPlayerId);
  }

  sourceWorld.move(sourcePlayerId, target);

  manager.setFocusedContextId(next);
  engine.scene.setActiveWorld(next);
}

function setInsideContext(
  world: ReturnType<typeof useWorld>,
  playerId: EntityId,
  contextId: ContextId,
  sourceRegionEntity: EntityId,
): void {
  const insideContext = world.get(playerId, InsideContext);

  if (insideContext) {
    insideContext.contextId = contextId;
    insideContext.sourceRegionEntity = sourceRegionEntity;
    return;
  }

  world.add(playerId, new InsideContext(contextId, sourceRegionEntity));
}
