export type ShaderUniformValue =
  | number
  | readonly [number]
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number];

export type ShaderUniforms = Readonly<Record<string, ShaderUniformValue>>;

export type ShaderUniformDefinition<TUniforms extends ShaderUniforms> = {
  readonly [TKey in keyof TUniforms]?: TUniforms[TKey];
};

export type ShaderSourceAsset<TUniforms extends ShaderUniforms = Record<never, never>> = {
  type: "shader";
  vertex: string;
  fragment: string;
  readonly __uniforms?: TUniforms;
};

/** Create compile-time-only uniform metadata for a shader source asset. */
export function createUniforms<TUniforms extends ShaderUniforms>(): ShaderUniformDefinition<TUniforms> {
  return {};
}