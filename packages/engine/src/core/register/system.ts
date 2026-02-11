import type { InferStandardSchema, StandardSchema } from "../types";

/***** TYPE DEFINITIONS *****/
export type SystemPriority = number | { update?: number; render?: number };
export type SystemOpts<TSchema extends StandardSchema, TMethods extends Record<string, any>> = {
  schema: {
    default: InferStandardSchema<NoInfer<TSchema>>["input"];
    schema: TSchema;
  };
  phase?: "update" | "render" | "all";
  priority?: SystemPriority;
  enabled?: boolean;
  system: () => void;
  initialize?: () => void;
  methods?: (system: EngineSystem<TSchema>) => TMethods;
};
export type SystemFactory<
  TName extends string,
  TSchema extends StandardSchema,
  TMethods extends Record<string, any>,
> = {
  (): EngineSystem<TSchema> & TMethods;
  ["~types"]: {
    name: TName;
    schema: TSchema;
  };
};

// Tuple of SystemFactory types
export type SystemFactoryTuple = Array<SystemFactory<string, StandardSchema, Record<string, any>>>;

export type EngineSystem<TSchema extends StandardSchema = StandardSchema> = {
  name: string;
  data: InferStandardSchema<TSchema>["output"];
  schema: TSchema;
  phase: "update" | "render" | "all";
  priority: SystemPriority;
  system: () => void;
  initialize?: () => void;
  enabled: boolean;
};

export type EngineInitializationSystem = {
  system: () => Promise<void> | void;
};

/***** COMPONENT START *****/
export const createSystem = <TName extends string>(name: TName) => {
  return <TSchema extends StandardSchema = StandardSchema, TMethods extends Record<string, any> = object>(
    opts: SystemOpts<TSchema, TMethods>,
  ): SystemFactory<TName, TSchema, TMethods> => {
    // If the HMR runtime is active and a system with this name already
    // exists, hot-swap the live system's behaviour while keeping its state.
    // This runs at module-evaluation time so wrapped factories (e.g. plugin
    // systems that take options) are handled transparently.
    const hmr = globalThis.__ENGINE_HMR__;
    if (hmr?.onSystemCreated) {
      hmr.onSystemCreated({
        name,
        system: opts.system,
        initialize: opts.initialize,
        phase: opts.phase ?? "update",
        priority: opts.priority ?? 0,
        enabled: opts.enabled ?? true,
      });
    }

    const factory = (): EngineSystem<TSchema> & TMethods => {
      const system: EngineSystem<TSchema> = {
        name: name,
        data: opts.schema.default,
        schema: opts.schema.schema,
        phase: opts.phase ?? "update",
        priority: opts.priority ?? 0,
        enabled: opts.enabled ?? true,
        system: opts.system,
        initialize: opts.initialize,
      };

      const methods = opts.methods ? opts.methods(system) : ({} as TMethods);

      return Object.assign(system, methods);
    };

    const result: SystemFactory<TName, TSchema, TMethods> = Object.assign(factory, {
      ["~types"]: {
        name: name,
        schema: opts.schema.schema,
      },
    });

    return result;
  };;
};

export const createInitializationSystem = (system: () => void): EngineInitializationSystem => {
  return {
    system,
  };
};
