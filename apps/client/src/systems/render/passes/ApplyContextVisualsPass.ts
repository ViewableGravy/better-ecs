import { PlayerComponent } from "@/components/player";
import { ContextVisualBinding } from "@/scenes/spatial-contexts-demo/components/context-visual-binding";
import { InsideContext } from "@/scenes/spatial-contexts-demo/components/inside-context";
import {
  HOUSE_INTERIOR,
  HOUSE_ROOF,
  OUTSIDE,
  RenderVisibility,
} from "@/scenes/spatial-contexts-demo/components/render-visibility";
import { getHouseBlend } from "@/scenes/spatial-contexts-demo/systems/house-transition.state";
import { lerp } from "@/utilities/math";
import { createRenderPass, useEngine } from "@repo/engine";
import { Shape, Sprite } from "@repo/engine/components";
import {
  getManager,
  type ContextId,
  type SpatialContextManager,
} from "@repo/spatial-contexts";

const INSIDE_OUTSIDE_ALPHA = 0.5;

export const ApplyContextVisualsPass = createRenderPass("apply-context-visuals")({
  execute() {
    const engine = useEngine();
    const manager = getManager(engine.scene.context);
    if (!manager) {
      return;
    }

    const rootContextId = manager.rootContextId;
    const focused = manager.focusedContextId;
    const activeInteriorContextId = getActiveInteriorContextId(manager, focused, rootContextId);
    const blend = getHouseBlend(engine.frame.updateProgress);

    for (const { id: contextId } of manager.listDefinitions()) {
      const world = manager.getWorld(contextId);
      if (!world) {
        continue;
      }

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

        sprite.tint.a = playerAlpha;
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
          blend,
          worldContextId: contextId,
          activeInteriorContextId,
          visualContextId: visualBinding?.contextId,
        });

        shape.fill.a = visibility.baseAlpha * alphaMultiplier;

        if (shape.stroke) {
          shape.stroke.a = visibility.baseAlpha * alphaMultiplier;
        }
      }
    }
  },
});

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
  blend: number;
  worldContextId: ContextId;
  activeInteriorContextId?: ContextId;
  visualContextId?: ContextId;
}): number {
  const { role, blend, worldContextId, activeInteriorContextId, visualContextId } = args;

  if (role === OUTSIDE) {
    return lerp(1, INSIDE_OUTSIDE_ALPHA, blend);
  }

  if (role === HOUSE_ROOF) {
    if (activeInteriorContextId && visualContextId === activeInteriorContextId) {
      return 1 - blend;
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

    return blend;
  }

  return 1;
}
