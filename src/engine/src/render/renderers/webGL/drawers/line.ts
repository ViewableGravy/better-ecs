import invariant from "tiny-invariant";
import { createDrawer } from "@engine/render/renderers/webGL/drawers/create";
import { buildLineVertices } from "@engine/render/renderers/webGL/drawers/geometry";

export const lineDrawer = createDrawer((context, data) => {
  invariant(data.type === "line", "Expected shape type to be line");
  invariant(data.stroke, "Expected line to have a stroke color");

  const vertices = buildLineVertices(context.canvas, context.center, data, context.cameraZoom);
  context.drawColorTriangles(vertices, data.stroke);
});
