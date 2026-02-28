import { createDrawer } from "@render/renderers/webGL/drawers/create";
import { buildCircleQuadVertices } from "@render/renderers/webGL/drawers/geometry";
import invariant from "tiny-invariant";

const CIRCLE_UV = new Float32Array([
  0, 1,
  1, 1,
  0, 0,
  1, 0,
]);

export const circleDrawer = createDrawer((context, data) => {
  invariant(data.type === "circle", "Expected shape type to be circle");

  const circleProgram = context.programs.get("circle");
  if (
    !circleProgram.fillColorUniformLocation
    || !circleProgram.strokeColorUniformLocation
    || !circleProgram.hasStrokeUniformLocation
    || !circleProgram.strokeThicknessUniformLocation
    || !circleProgram.fillEnabledUniformLocation
    || !circleProgram.arcEnabledUniformLocation
    || !circleProgram.arcStartUniformLocation
    || !circleProgram.arcEndUniformLocation
    || !circleProgram.arcDirectionUniformLocation
  ) {
    return;
  }

  const quadVertices = buildCircleQuadVertices(
    context.canvas, 
    context.center, 
    data, 
    context.cameraZoom
  );

  context.gl.useProgram(circleProgram.program);
  context.gl.bindVertexArray(circleProgram.vertexArray);

  context.gl.bindBuffer(context.gl.ARRAY_BUFFER, circleProgram.positionBuffer);
  context.gl.bufferData(context.gl.ARRAY_BUFFER, quadVertices, context.gl.DYNAMIC_DRAW);

  context.gl.bindBuffer(context.gl.ARRAY_BUFFER, circleProgram.uvBuffer);
  context.gl.bufferData(context.gl.ARRAY_BUFFER, CIRCLE_UV, context.gl.DYNAMIC_DRAW);

  const hasStroke = data.stroke !== null;
  const radiusPixels = Math.max(0.0001, (Math.min(data.width * data.scaleX, data.height * data.scaleY) * context.cameraZoom) / 2);
  const strokeThickness = hasStroke ? Math.min(1, Math.max(0, (data.strokeWidth * context.cameraZoom) / radiusPixels)) : 0;
  const fillEnabled = data.fillEnabled ?? true;
  const arcEnabled = data.arcEnabled ?? false;
  const arcStart = data.arcStart ?? 0;
  const arcEnd = data.arcEnd ?? Math.PI * 2;

  context.gl.uniform4f(circleProgram.fillColorUniformLocation, data.fill.r, data.fill.g, data.fill.b, data.fill.a);
  context.gl.uniform4f(
    circleProgram.strokeColorUniformLocation,
    data.stroke?.r ?? 0,
    data.stroke?.g ?? 0,
    data.stroke?.b ?? 0,
    data.stroke?.a ?? 0,
  );
  context.gl.uniform1f(circleProgram.hasStrokeUniformLocation, hasStroke ? 1 : 0);
  context.gl.uniform1f(circleProgram.strokeThicknessUniformLocation, strokeThickness);
  context.gl.uniform1f(circleProgram.fillEnabledUniformLocation, fillEnabled ? 1 : 0);
  context.gl.uniform1f(circleProgram.arcEnabledUniformLocation, arcEnabled ? 1 : 0);
  context.gl.uniform1f(circleProgram.arcStartUniformLocation, arcStart);
  context.gl.uniform1f(circleProgram.arcEndUniformLocation, arcEnd);
  context.gl.uniform1f(
    circleProgram.arcDirectionUniformLocation,
    arcEnd - arcStart >= 0 ? 1 : -1,
  );

  context.gl.drawArrays(context.gl.TRIANGLE_STRIP, 0, 4);
  context.gl.bindVertexArray(null);
});
