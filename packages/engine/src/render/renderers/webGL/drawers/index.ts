import { circleDrawer } from "./circle";
import { createShapeDrawerRegistry } from "./create";
import { lineDrawer } from "./line";
import { rectangleDrawer } from "./rectangle";

export const shapeDrawers = createShapeDrawerRegistry({
  rectangle: rectangleDrawer,
  circle: circleDrawer,
  line: lineDrawer,
});

export type { ShapeDrawerContext, ShapeDrawerRegistry, Vec2 } from "./types";
