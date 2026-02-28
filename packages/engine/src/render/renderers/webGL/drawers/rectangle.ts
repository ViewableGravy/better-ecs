import { createDrawer } from "@render/renderers/webGL/drawers/create";
import { buildRectangleVertices } from "@render/renderers/webGL/drawers/geometry";

export const rectangleDrawer = createDrawer((context, data) => {
  const vertices = buildRectangleVertices(context.canvas, context.center, data, context.cameraZoom);
  context.drawColorTriangles(vertices, data.fill);
});
