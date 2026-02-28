import { circleDrawer } from "@render/renderers/webGL/drawers/circle";
import { createShapeDrawerRegistry } from "@render/renderers/webGL/drawers/create";
import { lineDrawer } from "@render/renderers/webGL/drawers/line";
import { rectangleDrawer } from "@render/renderers/webGL/drawers/rectangle";
import { roundedRectangleDrawer } from "@render/renderers/webGL/drawers/rounded-rectangle";

export const shapeDrawers = createShapeDrawerRegistry({
  rectangle: rectangleDrawer,
  circle: circleDrawer,
  line: lineDrawer,
  "rounded-rectangle": roundedRectangleDrawer,
});

export type { ShapeDrawerContext, ShapeDrawerRegistry, Vec2 } from "@render/renderers/webGL/drawers/types";
