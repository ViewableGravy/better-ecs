import invariant from "tiny-invariant";
import colorFragmentShaderSource from "../../shaders/color.frag";
import colorVertexShaderSource from "../../shaders/color.vert";
import { createProgram } from "../create";

export interface ColorProgram {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
  colorUniformLocation: WebGLUniformLocation | null;
}

export const createColorProgram = createProgram<ColorProgram>((gl, compiler) => {
  const program = compiler.createProgram(
    compiler.compile(gl.VERTEX_SHADER, colorVertexShaderSource, "color.vert"), 
    compiler.compile(gl.FRAGMENT_SHADER, colorFragmentShaderSource, "color.frag")
  );

  const positionBuffer = gl.createBuffer();
  const vertexArray = gl.createVertexArray();

  invariant(positionBuffer, "Failed to create position buffer for color program");
  invariant(vertexArray, "Failed to create vertex array for color program");

  const positionLocation = 0;
  const colorUniformLocation = gl.getUniformLocation(program, "uColor");

  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  return {
    program,
    positionBuffer,
    vertexArray,
    colorUniformLocation,
  };
});
