import { ContextVisualBinding } from "@client/components/context-visual-binding";
import { InsideContext } from "@client/components/inside-context";
import { PlayerComponent } from "@client/components/player";
import {
    HOUSE_INTERIOR,
    HOUSE_ROOF,
    OUTSIDE,
    RenderVisibility,
} from "@client/components/render-visibility";
import {
    BlendTransition,
    BlendTransitionMutator,
} from "@client/systems/world/house-transition/transitionMutator";
import { lerp } from "@client/utilities/math";
import { createRenderPass, mutate, type UserWorld } from "@engine";
import { Shape, Sprite } from "@engine/components";
import { Engine, fromContext } from "@engine/context";
import {
    SpatialContexts,
    type ContextId,
    type SpatialContextManager,
} from "@libs/spatial-contexts";

const INSIDE_OUTSIDE_ALPHA = 0.5;
const transitionMutator = new BlendTransitionMutator();

export const ApplyContextVisualsPass = createRenderPass("apply-context-visuals")({
  scope: "world",
  execute({ world }) {
    const engine = fromContext(Engine);
    const manager = SpatialContexts.getManager(engine.scene.context);
    if (!manager) {
      return;
    }

    const contextId = getContextIdByWorld(manager, world);
    if (!contextId) {
      return;
    }

    const rootContextId = manager.rootContextId;
    const focused = manager.focusedContextId;
    const activeInteriorContextId = getActiveInteriorContextId(manager, focused, rootContextId);
    const blendByContext = getRoofBlendByContext(manager, engine.meta.updateProgress);
    const activeInteriorBlend =
      activeInteriorContextId === undefined
        ? 0
        : (blendByContext.get(activeInteriorContextId) ?? 0);

    const playerAlpha = getPlayerAlpha({
      contextId,
      focusedContextId: focused,
      rootContextId,
      activeInteriorContextId,
    });

    for (const entityId of world.query(PlayerComponent, Sprite)) {
      const sprite = world.get(entityId, Sprite);
      if (!sprite) {
        continue;
      }

      mutate(sprite, "tint", (tint) => {
        tint.a = playerAlpha;
      });
    }

    for (const entityId of world.query(Shape, RenderVisibility)) {
      const shape = world.get(entityId, Shape);
      const visibility = world.get(entityId, RenderVisibility);
      if (!shape || !visibility) {
        continue;
      }

      const visualBinding = world.get(entityId, ContextVisualBinding);
      const alphaMultiplier = getAlphaMultiplier({
        role: visibility.role,
        blendByContext,
        activeInteriorBlend,
        worldContextId: contextId,
        activeInteriorContextId,
        visualContextId: visualBinding?.contextId,
      });

      mutate(shape, "fill", (fill) => {
        fill.a = visibility.baseAlpha * alphaMultiplier;
      });

      if (shape.stroke) {
        mutate(shape, "stroke", (stroke) => {
          if (stroke) {
            stroke.a = visibility.baseAlpha * alphaMultiplier;
          }
        });
      }
    }
  },
});

function getContextIdByWorld(
  manager: SpatialContextManager,
  world: UserWorld,
): ContextId | undefined {
  for (const { id } of manager.listDefinitions()) {
    if (manager.getWorld(id) === world) {
      return id;
    }
  }

  return undefined;
}

function getActiveInteriorContextId(
  manager: SpatialContextManager,
  focusedContextId: ContextId,
  rootContextId: ContextId,
): ContextId | undefined {
  if (focusedContextId !== rootContextId) {
    return focusedContextId;
  }

  const rootWorld = manager.getWorld(rootContextId);
  if (!rootWorld) {
    return undefined;
  }

  const [playerId] = rootWorld.query(PlayerComponent);
  if (!playerId) {
    return undefined;
  }

  return rootWorld.get(playerId, InsideContext)?.contextId;
}

function getPlayerAlpha(args: {
  contextId: ContextId;
  focusedContextId: ContextId;
  rootContextId: ContextId;
  activeInteriorContextId?: ContextId;
}): number {
  const { contextId, focusedContextId, rootContextId, activeInteriorContextId } = args;

  if (focusedContextId === rootContextId && activeInteriorContextId) {
    if (contextId === activeInteriorContextId) {
      return 1;
    }

    if (contextId === rootContextId) {
      return 1;
    }

    return 0;
  }

  return contextId === focusedContextId ? 1 : 0;
}

function getAlphaMultiplier(args: {
  role: RenderVisibility["role"];
  blendByContext: ReadonlyMap<ContextId, number>;
  activeInteriorBlend: number;
  worldContextId: ContextId;
  activeInteriorContextId?: ContextId;
  visualContextId?: ContextId;
}): number {
  const {
    role,
    blendByContext,
    activeInteriorBlend,
    worldContextId,
    activeInteriorContextId,
    visualContextId,
  } = args;

  if (role === OUTSIDE) {
    return lerp(1, INSIDE_OUTSIDE_ALPHA, activeInteriorBlend);
  }

  if (role === HOUSE_ROOF) {
    if (activeInteriorContextId && visualContextId === activeInteriorContextId) {
      return 1 - (blendByContext.get(activeInteriorContextId) ?? 0);
    }

    return 1;
  }

  if (role === HOUSE_INTERIOR) {
    if (!activeInteriorContextId) {
      return 0;
    }

    if (worldContextId !== activeInteriorContextId) {
      return 0;
    }

    return blendByContext.get(worldContextId) ?? 0;
  }

  return 1;
}

function getRoofBlendByContext(
  manager: SpatialContextManager,
  alpha: number,
): ReadonlyMap<ContextId, number> {
  const blendByContext = new Map<ContextId, number>();

  const rootWorld = manager.getWorld(manager.rootContextId);
  if (!rootWorld) {
    return blendByContext;
  }

  for (const entityId of rootWorld.query(ContextVisualBinding, BlendTransition)) {
    const visualBinding = rootWorld.get(entityId, ContextVisualBinding);
    const transition = rootWorld.get(entityId, BlendTransition);
    if (!visualBinding || !transition) {
      continue;
    }

    transitionMutator.set(transition);
    blendByContext.set(visualBinding.contextId, transitionMutator.sample(alpha));
  }

  return blendByContext;
}
