// --- Type Registration (via module augmentation) ---
export interface Register {
  // Engine: EngineTypeInfo<...>
}

export type AnyEngine = {
  systems: Record<string, any>;
  world: any;
  frame: any;
};

export type RegisteredEngine<TRegister = Register> = 
  TRegister extends { 
    Engine: infer TEngine extends AnyEngine
  } 
    ? TEngine
    : AnyEngine;

/** 
 * Helper type to get all available system names including both user-defined 
 * and built-in engine systems.
 */
export type AllSystemNames<TRegister = Register> = keyof RegisteredEngine<TRegister>["systems"];
