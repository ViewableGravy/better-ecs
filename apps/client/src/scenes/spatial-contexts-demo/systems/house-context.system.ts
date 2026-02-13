import { PlayerComponent } from "@/components/player";
import { ensurePlayer } from "@/entities/player";
import { createSystem, type EntityId, useDelta, useWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { type ContextId, useContextManager } from "@repo/spatial-contexts";
import { ContextEntryRegion } from "../components/context-entry-region";
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

export const HouseContextSystem = createSystem("demo:context-focus")({
  phase: "update",
  system() {
    const manager = useContextManager();
    const world = useWorld();
    const [updateDelta] = useDelta();
    const rootContextId = manager.getRootContextId();

    tickHouseTransition(updateDelta);

    const [playerId] = world.query(PlayerComponent);
    if (!playerId) return;

    const transform = world.get(playerId, Transform2D);
    if (!transform) return;

    const focused = manager.getFocusedContextId();
    if (focused === rootContextId) {
      const region = findContainingContextRegion(world, transform);
      if (!region) {
        setHouseInsideTarget(false);
        const insideContext = world.get(playerId, InsideContext);
        if (insideContext) {
          syncPlayerToContext(manager, insideContext.contextId, transform);
        }
        if (isHouseBlendOutsideComplete()) {
          clearInsideContext(world, playerId);
        }
        return;
      }

      setInsideContext(world, playerId, region.contextId, region.regionEntityId);
      setHouseInsideTarget(true);
      switchContext(manager, region.contextId, transform);
      return;
    }

    const definition = manager.listDefinitions().find((item) => item.id === focused);
    if (!definition?.parentId) {
      clearInsideContext(world, playerId);
      setHouseInsideTarget(false);
      return;
    }

    const parentWorld = manager.getWorld(definition.parentId);
    if (!parentWorld) {
      clearInsideContext(world, playerId);
      setHouseInsideTarget(false);
      return;
    }

    const sourceRegion = findRegionByContextId(parentWorld, focused);
    if (!sourceRegion) {
      clearInsideContext(world, playerId);
      setHouseInsideTarget(false);
      return;
    }

    const sourceRegionBounds = parentWorld.get(sourceRegion.regionEntityId, ContextEntryRegion);
    if (!sourceRegionBounds) {
      clearInsideContext(world, playerId);
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
    const parentPlayerId = ensurePlayer(parentWorld);
    setInsideContext(parentWorld, parentPlayerId, focused, sourceRegion.regionEntityId);
    clearInsideContext(world, playerId);

    switchContext(manager, definition.parentId, transform);
  },
});

function switchContext(
  manager: ReturnType<typeof useContextManager>,
  next: ContextId,
  sourceTransform: Transform2D,
): void {
  const target = manager.getWorldOrThrow(next);
  const targetPlayer = ensurePlayer(target);
  const targetTransform = target.get(targetPlayer, Transform2D);
  if (!targetTransform) return;

  targetTransform.curr.copyFrom(sourceTransform.curr);
  targetTransform.prev.copyFrom(sourceTransform.prev);

  manager.setFocusedContextId(next);
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

function clearInsideContext(world: ReturnType<typeof useWorld>, playerId: EntityId): void {
  if (!world.has(playerId, InsideContext)) {
    return;
  }

  world.remove(playerId, InsideContext);
}

function syncPlayerToContext(
  manager: ReturnType<typeof useContextManager>,
  contextId: ContextId,
  sourceTransform: Transform2D,
): void {
  const targetWorld = manager.getWorld(contextId);
  if (!targetWorld) {
    return;
  }

  const targetPlayerId = ensurePlayer(targetWorld);
  const targetTransform = targetWorld.get(targetPlayerId, Transform2D);
  if (!targetTransform) {
    return;
  }

  targetTransform.curr.copyFrom(sourceTransform.curr);
  targetTransform.prev.copyFrom(sourceTransform.prev);
}
