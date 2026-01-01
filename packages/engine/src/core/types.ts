import type { StandardJSONSchemaV1 } from "@standard-schema/spec";

// --- Schema Types ---
export type StandardSchema = { '~standard': unknown };
export type InferStandardSchema<TSchema> = TSchema extends StandardJSONSchemaV1<infer TInput, infer TOutput> ? {
  input: TInput;
  output: TOutput;
} : never;

// --- System Types ---
export type SystemOpts<TSchema extends StandardSchema> = {
  schema: {
    default: InferStandardSchema<NoInfer<TSchema>>['input'];
    schema: TSchema;
  },
  phase?: "update" | "render";
  enabled?: boolean;
  system: () => void;
}

export type System<TName extends string, TSchema extends StandardSchema, TEngine = AnyEngine> = SystemOpts<TSchema> & {
  name: TName;
  enabled: boolean;
  engine: TEngine;
}

export type RegisteredSystem<TName extends string, TSchema extends StandardSchema> = {
  ["~types"]: {
    name: TName;
    schema: TSchema;
  }
}

export type EngineSystem<TSchema extends StandardSchema = StandardSchema> = {
  data: InferStandardSchema<TSchema>['input'];
  schema: TSchema;
  phase: "update" | "render";
  system: () => void;
  enabled: boolean;
}

// --- Engine Types ---

// 1. AnyEngine - Minimum definition
export interface AnyEngine {
  systems: Record<string, EngineSystem<any>>;
}

// 2. RegisterableEngine - Returned from register function
export type SystemsTuple = Array<RegisteredSystem<string, StandardSchema>>;

type SystemName<TSystem> = TSystem extends { 
  ["~types"]: { name: infer N extends string } 
} ? N : never;

type SystemsTupleToRecord<T extends SystemsTuple> = {
  [System in T[number] as SystemName<System>]: System['~types'];
}

export type RegisterableEngine<TSystems extends SystemsTuple> = {
  ["~types"]: {
    systems: SystemsTupleToRecord<TSystems>;
  }
}

// 3. RegisteredEngine - The actual type
export interface Register {
  // Engine: RegisterableEngine<...>
}

export type RegisteredEngineTypes<TRegister = Register> = 
  TRegister extends { 
    Engine: infer TEngine extends RegisterableEngine<any> 
  } 
    ? TEngine 
    : RegisterableEngine<[]>;

type RegisteredSystemsMap<TRegister = Register> = 
  RegisteredEngineTypes<TRegister>['~types']['systems'];

export type RegisteredEngine<TRegister = Register> = {
  systems: {
    [K in keyof RegisteredSystemsMap<TRegister> & string]: 
      RegisteredSystemsMap<TRegister>[K] extends { schema: infer S extends StandardSchema }
        ? EngineSystem<S>
        : EngineSystem<StandardSchema>;
  };
}
