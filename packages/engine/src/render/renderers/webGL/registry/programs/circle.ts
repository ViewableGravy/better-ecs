import invariant from "tiny-invariant";
import circleFragmentShaderSource from "../../shaders/circle.frag";
import circleVertexShaderSource from "../../shaders/circle.vert";
import { createProgram } from "../create";

export interface CircleProgram {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
  colorUniformLocation: WebGLUniformLocation | null;
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
    colorUniformLocation: gl.getUniformLocation(program, "uColor"),
  };
});