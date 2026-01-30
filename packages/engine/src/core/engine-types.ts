// --- Type Registration (via module augmentation) ---
export interface Register {
  // Engine: EngineTypeInfo<...>
}

export type AnyEngine = {
  systems: Record<string, any>;
  world: any;
  frame: any;
  scenes: Record<string, any>;
  scene: {
    set: (name: string) => Promise<void>;
    current: string | null;
    world: any;
    all: Record<string, any>;
  };
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

/**
 * Helper type to get all available scene names from the registered engine.
 */
export type AllSceneNames<TRegister = Register> = keyof RegisteredEngine<TRegister>["scenes"];
