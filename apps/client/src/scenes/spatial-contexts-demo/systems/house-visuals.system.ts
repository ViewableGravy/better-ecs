import { PlayerComponent } from "@/components/player";
import { createSystem, useDelta } from "@repo/engine";
import { Shape, Sprite } from "@repo/engine/components";
import { type ContextId, useContextManager } from "@repo/plugins";
import { ContextVisualBinding } from "../components/context-visual-binding";
import { InsideContext } from "../components/inside-context";
import { RenderVisibility } from "../components/render-visibility";
import { getHouseBlend } from "./house-transition.state";

const INSIDE_OUTSIDE_ALPHA = 0.5;

export const HouseVisualsSystem = createSystem("demo:context-visuals")({
  phase: "render",
  system() {
    const manager = useContextManager();
    const [, , updateProgress] = useDelta();
    const rootContextId = manager.getRootContextId();
    const focused = manager.getFocusedContextId();
    const activeInteriorContextId = getActiveInteriorContextId(manager, focused, rootContextId);
    const blend = getHouseBlend(updateProgress);

    for (const { id: contextId } of manager.listDefinitions()) {
      const world = manager.getWorld(contextId);
      if (!world) continue;

      const playerAlpha = contextId === focused ? 1 : 0;

      for (const entityId of world.query(PlayerComponent, Sprite)) {
        const sprite = world.get(entityId, Sprite);
        if (!sprite) continue;
        sprite.tint.a = playerAlpha;
      }

      for (const entityId of world.query(Shape, RenderVisibility)) {
        const shape = world.get(entityId, Shape);
        const visibility = world.get(entityId, RenderVisibility);
        if (!shape || !visibility) continue;

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
          shape.stroke.a =
            visibility.role === "house-roof"
              ? visibility.baseAlpha
              : visibility.baseAlpha * alphaMultiplier;
        }
      }
    }
  },
});

function getActiveInteriorContextId(
  manager: ReturnType<typeof useContextManager>,
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

function getAlphaMultiplier(args: {
  role: RenderVisibility["role"];
  blend: number;
  worldContextId: ContextId;
  activeInteriorContextId?: ContextId;
  visualContextId?: ContextId;
}): number {
  const { role, blend, worldContextId, activeInteriorContextId, visualContextId } = args;

  if (role === "outside") {
    return lerp(1, INSIDE_OUTSIDE_ALPHA, blend);
  }

  if (role === "house-roof") {
    if (activeInteriorContextId && visualContextId === activeInteriorContextId) {
      return 1 - blend;
    }

    return 1;
  }

  if (role === "house-interior") {
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

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}
