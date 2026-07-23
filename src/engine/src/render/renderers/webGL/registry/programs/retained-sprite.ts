import { createProgram } from "@engine/render/renderers/webGL/registry/create";
import spriteFragmentShaderSource from "@engine/render/renderers/webGL/shaders/sprite.frag";
import retainedSpriteVertexShaderSource from "@engine/render/renderers/webGL/shaders/retained-sprite.vert";
import invariant from "tiny-invariant";

export interface RetainedSpriteProgram {
  program: WebGLProgram;
  cornerBuffer: WebGLBuffer;
  viewportLocation: WebGLUniformLocation | null;
  cameraPositionLocation: WebGLUniformLocation | null;
  cameraZoomLocation: WebGLUniformLocation | null;
  interpolationAlphaLocation: WebGLUniformLocation | null;
  samplerLocation: WebGLUniformLocation | null;
}

export const createRetainedSpriteProgram = createProgram<RetainedSpriteProgram>((gl, compiler) => {
  const program = compiler.createProgram(
    compiler.compile(gl.VERTEX_SHADER, retainedSpriteVertexShaderSource, "retained-sprite.vert"),
    compiler.compile(gl.FRAGMENT_SHADER, spriteFragmentShaderSource, "sprite.frag"),
  );
  const cornerBuffer = gl.createBuffer();
  invariant(cornerBuffer, "Failed to create retained sprite corner buffer");

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

  return {
    program,
    cornerBuffer,
    viewportLocation: gl.getUniformLocation(program, "uViewport"),
    cameraPositionLocation: gl.getUniformLocation(program, "uCameraPosition"),
    cameraZoomLocation: gl.getUniformLocation(program, "uCameraZoom"),
    interpolationAlphaLocation: gl.getUniformLocation(program, "uInterpolationAlpha"),
    samplerLocation: gl.getUniformLocation(program, "uTexture"),
  };
});
