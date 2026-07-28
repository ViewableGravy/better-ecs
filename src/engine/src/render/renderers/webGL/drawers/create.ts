import type { ShapeRenderInput } from "@engine/render/types/low-level";
import type {
  ShapeDrawer,
  ShapeDrawerContext,
  ShapeDrawerMap,
  ShapeDrawerRegistry,
} from "@engine/render/renderers/webGL/drawers/types";

export function createDrawer(drawer: ShapeDrawer): ShapeDrawer {
  return drawer;
}

export function createShapeDrawerRegistry(drawers: ShapeDrawerMap): ShapeDrawerRegistry {
  return {
    get(type) {
      return drawers[type];
    },

    draw(context: ShapeDrawerContext, data: ShapeRenderInput): void {
      const drawer = drawers[data.type];
      drawer(context, data, this);
    },
  };
}
