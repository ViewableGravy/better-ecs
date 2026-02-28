import { createDrawer } from "@render/renderers/webGL/drawers/create";
import { buildCircleQuadVertices } from "@render/renderers/webGL/drawers/geometry";
import invariant from "tiny-invariant";

const ROUNDED_RECTANGLE_UV = new Float32Array([
  0, 1,
  1, 1,
  0, 0,
  1, 0,
]);

export const roundedRectangleDrawer = createDrawer((context, data) => {
  invariant(data.type === "rounded-rectangle", "Expected shape type to be rounded-rectangle");

  const roundedRectangleProgram = context.programs.get("roundedRectangle");

  if (
    !roundedRectangleProgram.fillColorUniformLocation
    || !roundedRectangleProgram.strokeColorUniformLocation
    || !roundedRectangleProgram.hasStrokeUniformLocation
    || !roundedRectangleProgram.strokeThicknessUniformLocation
    || !roundedRectangleProgram.fillEnabledUniformLocation
    || !roundedRectangleProgram.sizeUniformLocation
    || !roundedRectangleProgram.cornerRadiusUniformLocation
  ) {
    return;
  }

  const quadVertices = buildCircleQuadVertices(
    context.canvas,
    context.center,
    data,
    context.cameraZoom,
  );

  context.gl.useProgram(roundedRectangleProgram.program);
  context.gl.bindVertexArray(roundedRectangleProgram.vertexArray);

  context.gl.bindBuffer(context.gl.ARRAY_BUFFER, roundedRectangleProgram.positionBuffer);
  context.gl.bufferData(context.gl.ARRAY_BUFFER, quadVertices, context.gl.DYNAMIC_DRAW);

  context.gl.bindBuffer(context.gl.ARRAY_BUFFER, roundedRectangleProgram.uvBuffer);
  context.gl.bufferData(context.gl.ARRAY_BUFFER, ROUNDED_RECTANGLE_UV, context.gl.DYNAMIC_DRAW);

  const widthPixels = data.width * data.scaleX * context.cameraZoom;
  const heightPixels = data.height * data.scaleY * context.cameraZoom;

  context.gl.uniform4f(roundedRectangleProgram.fillColorUniformLocation, data.fill.r, data.fill.g, data.fill.b, data.fill.a);
  context.gl.uniform4f(
    roundedRectangleProgram.strokeColorUniformLocation,
    data.stroke?.r ?? 0,
    data.stroke?.g ?? 0,
    data.stroke?.b ?? 0,
    data.stroke?.a ?? 0,
  );
  context.gl.uniform1f(roundedRectangleProgram.hasStrokeUniformLocation, data.stroke ? 1 : 0);
  context.gl.uniform1f(
    roundedRectangleProgram.strokeThicknessUniformLocation,
    Math.max(0, data.strokeWidth * context.cameraZoom),
  );
  context.gl.uniform1f(roundedRectangleProgram.fillEnabledUniformLocation, (data.fillEnabled ?? true) ? 1 : 0);
  context.gl.uniform2f(roundedRectangleProgram.sizeUniformLocation, widthPixels, heightPixels);
  context.gl.uniform1f(
    roundedRectangleProgram.cornerRadiusUniformLocation,
    Math.max(0, (data.cornerRadius ?? 0) * context.cameraZoom),
  );

  context.gl.drawArrays(context.gl.TRIANGLE_STRIP, 0, 4);
  context.gl.bindVertexArray(null);
});
