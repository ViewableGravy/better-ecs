import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { InferStandardSchema, StandardSchema } from "../types";

/***** TYPE DEFINITIONS *****/
export type SystemPriority = number;
type EmptySystemData = Record<string, never>;
type EmptySystemSchema = StandardSchemaV1<EmptySystemData, EmptySystemData>;

const emptySystemSchema: EmptySystemSchema = {
  "~standard": {
    version: 1,
    vendor: "@repo/engine",
    validate: () => ({ value: {}, issues: [] }),
  },
};

const emptySystemSchemaConfig = {
  default: {},
  schema: emptySystemSchema,
};

export type SystemOpts<TSchema extends StandardSchema, TMethods extends Record<string, any>> = {
  schema?: {
    default: InferStandardSchema<NoInfer<TSchema>>["input"];
    schema: TSchema;
  };
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
  return <
    TSchema extends StandardSchema = EmptySystemSchema,
    TMethods extends Record<string, any> = object,
  >(
    opts: SystemOpts<TSchema, TMethods>,
  ): SystemFactory<TName, TSchema, TMethods> => {
    // `TSchema` is generic and may represent either a user-provided schema or
    // the implicit empty-object schema when omitted. This narrow cast keeps the
    // fallback localized to this boundary.
    const schemaConfig = (opts.schema ?? emptySystemSchemaConfig) as {
      default: InferStandardSchema<NoInfer<TSchema>>["input"];
      schema: TSchema;
    };

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
        priority: opts.priority ?? 0,
        enabled: opts.enabled ?? true,
      });
    }

    const factory = (): EngineSystem<TSchema> & TMethods => {
      const system: EngineSystem<TSchema> = {
        name: name,
        data: schemaConfig.default,
        schema: schemaConfig.schema,
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
        schema: schemaConfig.schema,
      },
    });

    return result;
  };
};

export const createInitializationSystem = (system: () => void): EngineInitializationSystem => {
  return {
    system,
  };
};
