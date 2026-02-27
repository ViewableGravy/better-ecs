export class ShaderCompiler {
  constructor(
    private gl: WebGL2RenderingContext
  ) {}

  compile(type: number, source: string, label: string): WebGLShader {
    const shader = this.gl.createShader(type);

    if (!shader) {
      throw new Error(`Failed to create WebGL shader for ${label}`);
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const infoLog = this.gl.getShaderInfoLog(shader) ?? "Unknown shader compile error";
      this.gl.deleteShader(shader);
      throw new Error(`[${label}] ${infoLog}`);
    }
    
    return shader;
  }
}