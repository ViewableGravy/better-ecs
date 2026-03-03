import invariant from "tiny-invariant";
import circleFragmentShaderSource from "@engine/render/renderers/webGL/shaders/circle.frag";
import circleVertexShaderSource from "@engine/render/renderers/webGL/shaders/circle.vert";
import { createProgram } from "@engine/render/renderers/webGL/registry/create";

export interface CircleProgram {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
  fillColorUniformLocation: WebGLUniformLocation | null;
  strokeColorUniformLocation: WebGLUniformLocation | null;
  hasStrokeUniformLocation: WebGLUniformLocation | null;
  strokeThicknessUniformLocation: WebGLUniformLocation | null;
  fillEnabledUniformLocation: WebGLUniformLocation | null;
  arcEnabledUniformLocation: WebGLUniformLocation | null;
  arcStartUniformLocation: WebGLUniformLocation | null;
  arcEndUniformLocation: WebGLUniformLocation | null;
  arcDirectionUniformLocation: WebGLUniformLocation | null;
}

export const createCircleProgram = createProgram<CircleProgram>((gl, compiler) => {
  const program = compiler.createProgram(
    compiler.compile(gl.VERTEX_SHADER, circleVertexShaderSource, "circle.vert"), 
    compiler.compile(gl.FRAGMENT_SHADER, circleFragmentShaderSource, "circle.frag")
  );

  const positionBuffer = gl.createBuffer();
  const uvBuffer = gl.createBuffer();
  const vertexArray = gl.createVertexArray();

  invariant(positionBuffer, "Failed to create position buffer for circle program");
  invariant(uvBuffer, "Failed to create UV buffer for circle program");
  invariant(vertexArray, "Failed to create vertex array for circle program");

  gl.bindVertexArray(vertexArray);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  return {
    program,
    positionBuffer,
    uvBuffer,
    vertexArray,
    fillColorUniformLocation: gl.getUniformLocation(program, "uFillColor"),
    strokeColorUniformLocation: gl.getUniformLocation(program, "uStrokeColor"),
    hasStrokeUniformLocation: gl.getUniformLocation(program, "uHasStroke"),
    strokeThicknessUniformLocation: gl.getUniformLocation(program, "uStrokeThickness"),
    fillEnabledUniformLocation: gl.getUniformLocation(program, "uFillEnabled"),
    arcEnabledUniformLocation: gl.getUniformLocation(program, "uArcEnabled"),
    arcStartUniformLocation: gl.getUniformLocation(program, "uArcStart"),
    arcEndUniformLocation: gl.getUniformLocation(program, "uArcEnd"),
    arcDirectionUniformLocation: gl.getUniformLocation(program, "uArcDirection"),
  };
});