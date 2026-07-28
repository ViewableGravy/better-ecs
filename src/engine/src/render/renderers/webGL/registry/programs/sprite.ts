import { createProgram } from "@engine/render/renderers/webGL/registry/create";
import spriteFragmentShaderSource from "@engine/render/renderers/webGL/shaders/sprite.frag";
import spriteVertexShaderSource from "@engine/render/renderers/webGL/shaders/sprite.vert";
import invariant from "tiny-invariant";

export interface SpriteProgram {
  program: WebGLProgram;
  cornerBuffer: WebGLBuffer;
  instanceBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
  viewportLocation: WebGLUniformLocation | null;
  samplerLocation: WebGLUniformLocation | null;
}

export const createSpriteProgram = createProgram<SpriteProgram>((gl, compiler) => {
  const program = compiler.createProgram(
    compiler.compile(gl.VERTEX_SHADER, spriteVertexShaderSource, "sprite.vert"), 
    compiler.compile(gl.FRAGMENT_SHADER, spriteFragmentShaderSource, "sprite.frag")
  );

  const cornerBuffer = gl.createBuffer();
  const instanceBuffer = gl.createBuffer();
  const vertexArray = gl.createVertexArray();

  invariant(cornerBuffer, "Failed to create corner buffer for sprite program");
  invariant(instanceBuffer, "Failed to create instance buffer for sprite program");
  invariant(vertexArray, "Failed to create vertex array for sprite program");

  const instanceStride = 17 * Float32Array.BYTES_PER_ELEMENT;

  gl.bindVertexArray(vertexArray);

  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, instanceStride, 0);
  gl.vertexAttribDivisor(1, 1);

  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, instanceStride, 2 * Float32Array.BYTES_PER_ELEMENT);
  gl.vertexAttribDivisor(2, 1);

  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 1, gl.FLOAT, false, instanceStride, 4 * Float32Array.BYTES_PER_ELEMENT);
  gl.vertexAttribDivisor(3, 1);

  gl.enableVertexAttribArray(4);
  gl.vertexAttribPointer(4, 2, gl.FLOAT, false, instanceStride, 5 * Float32Array.BYTES_PER_ELEMENT);
  gl.vertexAttribDivisor(4, 1);

  gl.enableVertexAttribArray(5);
  gl.vertexAttribPointer(5, 2, gl.FLOAT, false, instanceStride, 7 * Float32Array.BYTES_PER_ELEMENT);
  gl.vertexAttribDivisor(5, 1);

  gl.enableVertexAttribArray(6);
  gl.vertexAttribPointer(6, 4, gl.FLOAT, false, instanceStride, 9 * Float32Array.BYTES_PER_ELEMENT);
  gl.vertexAttribDivisor(6, 1);

  gl.enableVertexAttribArray(7);
  gl.vertexAttribPointer(7, 4, gl.FLOAT, false, instanceStride, 13 * Float32Array.BYTES_PER_ELEMENT);
  gl.vertexAttribDivisor(7, 1);

  gl.bindVertexArray(null);

  return {
    program,
    cornerBuffer,
    instanceBuffer,
    vertexArray,
    viewportLocation: gl.getUniformLocation(program, "uViewport"),
    samplerLocation: gl.getUniformLocation(program, "uTexture"),
  };
});