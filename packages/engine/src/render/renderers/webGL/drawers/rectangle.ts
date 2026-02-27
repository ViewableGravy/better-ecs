import { createDrawer } from "./create";
import { buildRectangleVertices } from "./geometry";

export const rectangleDrawer = createDrawer((context, data) => {
  const vertices = buildRectangleVertices(context.canvas, context.center, data, context.cameraZoom);
  context.drawColorTriangles(vertices, data.fill);
});
