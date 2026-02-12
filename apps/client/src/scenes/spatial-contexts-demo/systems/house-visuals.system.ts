import { PlayerComponent } from "@/components/player";
import { createSystem } from "@repo/engine";
import { Shape, Sprite } from "@repo/engine/components";
import { useContextManager } from "@repo/plugins";
import z from "zod";
import { RenderVisibility } from "../components/render-visibility";
import { DUNGEON, HOUSE, OVERWORLD } from "../constants";
import { getHouseBlend } from "./house-transition.state";

const INSIDE_OUTSIDE_ALPHA = 0.5;

export const HouseVisualsSystem = createSystem("client:house-visuals")({
  phase: "render",
  schema: {
    default: {},
    schema: z.object({}),
  },
  system() {
    const manager = useContextManager();
    const focused = manager.getFocusedContextId();
    const blend = getHouseBlend();

    for (const contextId of [OVERWORLD, HOUSE, DUNGEON] as const) {
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

        const alphaMultiplier = getAlphaMultiplier(visibility.role, blend);
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

function getAlphaMultiplier(role: RenderVisibility["role"], blend: number): number {
  if (role === "outside") {
    return lerp(1, INSIDE_OUTSIDE_ALPHA, blend);
  }

  if (role === "house-roof") {
    return 1 - blend;
  }

  if (role === "house-interior") {
    return blend;
  }

  return 1;
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}
