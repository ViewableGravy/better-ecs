import { circleDrawer } from "@engine/render/renderers/webGL/drawers/circle";
import { createShapeDrawerRegistry } from "@engine/render/renderers/webGL/drawers/create";
import { lineDrawer } from "@engine/render/renderers/webGL/drawers/line";
import { rectangleDrawer } from "@engine/render/renderers/webGL/drawers/rectangle";
import { roundedRectangleDrawer } from "@engine/render/renderers/webGL/drawers/rounded-rectangle";

export const shapeDrawers = createShapeDrawerRegistry({
  rectangle: rectangleDrawer,
  circle: circleDrawer,
  line: lineDrawer,
  "rounded-rectangle": roundedRectangleDrawer,
});

export type { ShapeDrawerContext, ShapeDrawerRegistry, Vec2 } from "@engine/render/renderers/webGL/drawers/types";
