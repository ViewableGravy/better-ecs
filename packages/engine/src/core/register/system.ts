import type {
  InferStandardSchema,
  StandardSchema
} from "../types";

/***** TYPE DEFINITIONS *****/
export type SystemOpts<TSchema extends StandardSchema> = {
  schema: {
    default: InferStandardSchema<NoInfer<TSchema>>['input'];
    schema: TSchema;
  },
  phase?: "update" | "render";
  enabled?: boolean;
  system: () => void;
  initialize?: () => void;
}

export type SystemFactory<TName extends string, TSchema extends StandardSchema> = {
  (): EngineSystem<TSchema>;
  ["~types"]: {
    name: TName;
    schema: TSchema;
  };
}

export type EngineSystem<TSchema extends StandardSchema = StandardSchema> = {
  name: string;
  data: InferStandardSchema<TSchema>['output'];
  schema: TSchema;
  phase: "update" | "render";
  system: () => void;
  initialize?: () => void;
  enabled: boolean;
}

export type EngineInitializationSystem = {
  system: (() => Promise<void> | void);
}

/***** COMPONENT START *****/
export const createSystem = <TName extends string>(name: TName) => {
  return <TSchema extends StandardSchema = StandardSchema>(
    opts: SystemOpts<TSchema>
  ): SystemFactory<TName, TSchema> => {
    const factory = (): EngineSystem<TSchema> => {
      return {
        name: name,
        data: opts.schema.default,
        schema: opts.schema.schema,
        phase: opts.phase ?? "update",
        enabled: opts.enabled ?? true,
        system: opts.system,
        initialize: opts.initialize,
      };
    };

    const result: SystemFactory<TName, TSchema> =  Object.assign(factory, {
      ["~types"]: {
        name: name,
        schema: opts.schema.schema,
      }
    });
    
    return result;
  };
};

export const createInitializationSystem = (system: () => void): EngineInitializationSystem => {
  return {
    system,
  };
};
