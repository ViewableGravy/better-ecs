import { createDrawer } from "./create";
import { buildCircleQuadVertices } from "./geometry";

const CIRCLE_UV = new Float32Array([
  0, 1,
  1, 1,
  0, 0,
  1, 0,
]);

export const circleDrawer = createDrawer((context, data) => {
  const circleProgram = context.programs.get("circle");
  if (!circleProgram.colorUniformLocation) {
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

  context.gl.uniform4f(circleProgram.colorUniformLocation, data.fill.r, data.fill.g, data.fill.b, data.fill.a);
  context.gl.drawArrays(context.gl.TRIANGLE_STRIP, 0, 4);
  context.gl.bindVertexArray(null);
});
