import type { ShaderCompiler } from "@render/renderers/webGL/compiler";

export interface BaseProgram {
  program: WebGLProgram;
}

export type ProgramFactory<TProgram extends BaseProgram> = (
  gl: WebGL2RenderingContext,
  compiler: ShaderCompiler,
) => TProgram;

export function createProgram<TProgram extends BaseProgram>(
  factory: ProgramFactory<TProgram>,
): ProgramFactory<TProgram> {
  return factory;
}

type ProgramFactories = Record<string, ProgramFactory<BaseProgram>>;

type ProgramInstances<TProgramFactories extends ProgramFactories> = {
  [TKey in keyof TProgramFactories]: ReturnType<TProgramFactories[TKey]>;
};

export interface ProgramRegistry<TProgramFactories extends ProgramFactories> {
  initialize(gl: WebGL2RenderingContext, compiler: ShaderCompiler): void;
  get<TKey extends keyof TProgramFactories>(key: TKey): ProgramInstances<TProgramFactories>[TKey];
}

export function createProgramRegistry<TProgramFactories extends ProgramFactories>(
  programFactories: TProgramFactories,
): ProgramRegistry<TProgramFactories> {
  let programs: ProgramInstances<TProgramFactories> | null = null;

  return {
    initialize(gl: WebGL2RenderingContext, compiler: ShaderCompiler): void {
      const initializedPrograms = Object.entries(programFactories).reduce<Record<string, unknown>>((acc, [key, factory]) => {
        acc[key] = factory(gl, compiler);
        return acc;
      }, {});

      // We build this object from the same keys as `programFactories`, so this cast safely narrows the record shape.
      programs = initializedPrograms as ProgramInstances<TProgramFactories>;
    },

    get<TKey extends keyof TProgramFactories>(key: TKey): ProgramInstances<TProgramFactories>[TKey] {
      if (!programs) {
        throw new Error("WebGL program registry is not initialized");
      }

      return programs[key];
    },
  };
}