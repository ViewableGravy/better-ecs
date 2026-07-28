import invariant from "tiny-invariant";
import roundedRectangleFragmentShaderSource from "@engine/render/renderers/webGL/shaders/rounded-rectangle.frag";
import roundedRectangleVertexShaderSource from "@engine/render/renderers/webGL/shaders/rounded-rectangle.vert";
import { createProgram } from "@engine/render/renderers/webGL/registry/create";

export interface RoundedRectangleProgram {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
  fillColorUniformLocation: WebGLUniformLocation | null;
  strokeColorUniformLocation: WebGLUniformLocation | null;
  hasStrokeUniformLocation: WebGLUniformLocation | null;
  strokeThicknessUniformLocation: WebGLUniformLocation | null;
  fillEnabledUniformLocation: WebGLUniformLocation | null;
  sizeUniformLocation: WebGLUniformLocation | null;
  cornerRadiusUniformLocation: WebGLUniformLocation | null;
}

export const createRoundedRectangleProgram = createProgram<RoundedRectangleProgram>((gl, compiler) => {
  const program = compiler.createProgram(
    compiler.compile(gl.VERTEX_SHADER, roundedRectangleVertexShaderSource, "rounded-rectangle.vert"),
    compiler.compile(gl.FRAGMENT_SHADER, roundedRectangleFragmentShaderSource, "rounded-rectangle.frag"),
  );

  const positionBuffer = gl.createBuffer();
  const uvBuffer = gl.createBuffer();
  const vertexArray = gl.createVertexArray();

  invariant(positionBuffer, "Failed to create position buffer for rounded rectangle program");
  invariant(uvBuffer, "Failed to create UV buffer for rounded rectangle program");
  invariant(vertexArray, "Failed to create vertex array for rounded rectangle program");

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
    sizeUniformLocation: gl.getUniformLocation(program, "uSize"),
    cornerRadiusUniformLocation: gl.getUniformLocation(program, "uCornerRadius"),
  };
});
