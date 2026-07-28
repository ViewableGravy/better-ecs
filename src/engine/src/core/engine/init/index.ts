import type { EngineInitializationSystem } from "@engine/core/system";

export class InitState {
  #initializationSystem: EngineInitializationSystem | null = null;
  #initialized = false;

  public get initializationSystem(): EngineInitializationSystem | null {
    return this.#initializationSystem;
  }

  public get initialized(): boolean {
    return this.#initialized;
  }

  public setInitializationSystem(system: EngineInitializationSystem): void {
    this.#initializationSystem = system;
  }

  public markInitialized(): void {
    this.#initialized = true;
  }
}
