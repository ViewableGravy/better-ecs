import { engine } from "../consts/engine";
import type {
  RegisteredEngine,
  RegisteredSystem,
  StandardSchema,
  System,
  SystemOpts,
} from "../types";

export const createSystem = <TName extends string>(name: TName) => {
  return <TSchema extends StandardSchema = StandardSchema>(opts: SystemOpts<TSchema>): System<TName, TSchema, RegisteredEngine> => {
    return {
      name: name,
      enabled: opts.enabled ?? true,
      phase: opts.phase ?? "update",
      schema: opts.schema,
      system: opts.system,
      get engine(): RegisteredEngine {
        return engine;
      },
    };
  };
};

export const registerSystem = <
  TName extends string, 
  TSchema extends StandardSchema
>(system: System<TName, TSchema, any>): RegisteredSystem<NoInfer<TName>, TSchema> => {
  (engine.systems as any)[system.name] = {
    data: system.schema.default,
    schema: system.schema.schema,
    system: system.system,
    enabled: system.enabled,
    phase: system.phase,
  };

  return {
    ["~types"]: {
      name: system.name,
      schema: system.schema.schema
    }
  }
}
