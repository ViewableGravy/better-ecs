import invariant from "tiny-invariant";
import spriteFragmentShaderSource from "@render/renderers/webGL/shaders/sprite.frag";
import spriteVertexShaderSource from "@render/renderers/webGL/shaders/sprite.vert";
import { createProgram } from "@render/renderers/webGL/registry/create";

export interface SpriteProgram {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
  tintLocation: WebGLUniformLocation | null;
  samplerLocation: WebGLUniformLocation | null;
}

export const createSpriteProgram = createProgram<SpriteProgram>((gl, compiler) => {
  const program = compiler.createProgram(
    compiler.compile(gl.VERTEX_SHADER, spriteVertexShaderSource, "sprite.vert"), 
    compiler.compile(gl.FRAGMENT_SHADER, spriteFragmentShaderSource, "sprite.frag")
  );

  const positionBuffer = gl.createBuffer();
  const uvBuffer = gl.createBuffer();
  const vertexArray = gl.createVertexArray();

  invariant(positionBuffer, "Failed to create position buffer for sprite program");
  invariant(uvBuffer, "Failed to create UV buffer for sprite program");
  invariant(vertexArray, "Failed to create vertex array for sprite program");

  const positionLocation = 0;
  const uvLocation = 1;

  gl.bindVertexArray(vertexArray);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.enableVertexAttribArray(uvLocation);
  gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  return {
    program,
    positionBuffer,
    uvBuffer,
    vertexArray,
    tintLocation: gl.getUniformLocation(program, "uTint"),
    samplerLocation: gl.getUniformLocation(program, "uTexture"),
  };
});