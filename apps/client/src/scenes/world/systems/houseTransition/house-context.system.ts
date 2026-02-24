import { PlayerComponent } from "@/components/player";
import { ContextFocusBlendTransitionMutator } from "@/scenes/world/systems/houseTransition/contextTransitionMutator";
import {
  createSystem,
  type EntityId,
  useDelta,
  useWorld,
} from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { ContextEntryRegion, type ContextId, useContextManager } from "@repo/spatial-contexts";
import { InsideContext } from "../../components/inside-context";
import {
  findContainingContextRegion,
  findRegionByContextId,
  isInsideContextRegion,
} from "../../utilities/context-collision";
import { BlendTransition } from "./transitionMutator";

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
const transitionMutator = new ContextFocusBlendTransitionMutator();

/**********************************************************************************************************
 *   SYSTEM START
 **********************************************************************************************************/
export const HouseContextSystem = createSystem("main:context-focus")({
  system() {
    const manager = useContextManager();
    const world = useWorld();
    const [updateDelta] = useDelta();
    const [playerId] = world.invariantQuery(PlayerComponent);
    const playerTransform = world.require(playerId, Transform2D);
    const focused = manager.focusedContextId;

    // ensure the mutator has the manager reference. Manager not available in 
    // initialize (yet)
    transitionMutator.manager = manager;

    // Tick roof transitions for all contexts.
    for (const entityId of manager.rootWorld.query(BlendTransition)) {
      const transition = manager.rootWorld.require(entityId, BlendTransition);

      transitionMutator.set(transition);
      transitionMutator.tick(updateDelta);
    }
    
    if (manager.isRootFocused) {
      const region = findContainingContextRegion(world, playerTransform);

      for (const { contextId } of transitionMutator.rootVisualBindings()) {
        // If the player is inside of a context region, set that region's context to 1,
        // while all others are set to 0.
        transitionMutator.setTarget(contextId === region?.contextId ? 1 : 0);
      }

      if (region) {
        setInsideContext(world, playerId, region.contextId, region.regionEntityId);
        switchContext(manager, world, playerId, region.contextId);
        return;
      }

      const insideContext = world.get(playerId, InsideContext);

      // If the player is still marked as inside a context, but they aren't inside
      // the region anymore (given that no region was found here), then when the roof
      // blend is complete, remove the inside context component.
      if (insideContext) {
        for (const { contextId } of transitionMutator.rootVisualBindings()) {
          if (contextId === insideContext.contextId && transitionMutator.complete) {
            world.remove(playerId, InsideContext);
          }
        }
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
      return transitionMutator.applyFade(focused);
    }

    transitionMutator.applyFade();
    switchContext(manager, world, playerId, definition.parentId);
  },
});

function switchContext(
  manager: ReturnType<typeof useContextManager>,
  sourceWorld: ReturnType<typeof useWorld>,
  sourcePlayerId: EntityId,
  next: ContextId,
): void {
  const target = manager.requireWorld(next);

  sourceWorld.move(sourcePlayerId, target);

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
  } else {
    world.add(playerId, new InsideContext(contextId, sourceRegionEntity));
  }
}
