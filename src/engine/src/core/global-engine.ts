import type { AnyEngine, RegisteredEngine } from "@engine/core/engine-types";

export let registeredEngine: AnyEngine | null = null;

export function registerEngine(engine: AnyEngine): void {
  if (registeredEngine !== null) {
    throw new Error("createEngine() cannot be called more than once in the same process");
  }

  registeredEngine = engine;
}

export function unregisterEngine(): void {
  registeredEngine = null;
}

export function fromEngine<T>(select: (engine: RegisteredEngine) => T): T {
  if (registeredEngine === null) {
    throw new Error("fromEngine() called before createEngine() registered an engine.");
  }

  return select(registeredEngine as RegisteredEngine);
}