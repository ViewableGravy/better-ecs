import type { SceneDefinitionTuple } from "@engine/core/scene/scene.types";
import type { EngineSystem } from "@engine/core/system";
import { executeSystemCleanup, executeSystemInitialize } from "@engine/core/system";

type SceneSystemEntry = {
  all: EngineSystem[];
  update: EngineSystem[];
};

export class SystemsManager {
  #engineSystems: Record<string, EngineSystem<any>>;
  #engineUpdateSystems: EngineSystem<any>[] = [];

  #sceneSystems: Map<string, SceneSystemEntry> = new Map();
  #initializedSceneSystems: Set<string> = new Set();

  public constructor(systems: Record<string, EngineSystem<any>>) {
    this.#engineSystems = systems;
    this.#engineUpdateSystems = this.#sortSystemsForPhase(Object.values(systems));
  }

  public createSystemsView(getActiveSceneSystem: (name: string) => EngineSystem | undefined) {
    return new Proxy(this.#engineSystems, {
      get: (target, prop) => {
        if (typeof prop !== "string") return (target as any)[prop];
        if (prop in target) return (target as any)[prop];
        return getActiveSceneSystem(prop);
      },
      has: (target, prop) => {
        if (typeof prop !== "string") return prop in target;
        return prop in target || getActiveSceneSystem(prop) !== undefined;
      },
    });
  }

  public initializeEngineSystems(): void {
    for (const system of Object.values(this.#engineSystems)) {
      executeSystemInitialize(system);
    }
  }

  public getEngineUpdateSystems(): EngineSystem<any>[] {
    return this.#engineUpdateSystems;
  }

  public registerSceneSystems(scenes: SceneDefinitionTuple): void {
    for (const scene of scenes) {
      const instances = scene.systems.map((factory) => factory());
      this.#sceneSystems.set(scene.name, {
        all: instances,
        update: this.#sortSystemsForPhase(instances),
      });
    }
  }

  public getSceneUpdateSystems(sceneName: string | null): EngineSystem[] {
    if (!sceneName) return [];
    const entry = this.#sceneSystems.get(sceneName);
    if (!entry) return [];
    return entry.update;
  }

  public getSceneSystem(sceneName: string | null, name: string): EngineSystem | undefined {
    if (!sceneName) return undefined;
    const entry = this.#sceneSystems.get(sceneName);
    if (!entry) return undefined;
    return entry.all.find((system) => system.name === name);
  }

  public initializeSceneSystems(sceneName: string): void {
    if (this.#initializedSceneSystems.has(sceneName)) {
      return;
    }

    const systems = this.#sceneSystems.get(sceneName);
    if (!systems) {
      return;
    }

    for (const system of systems.all) {
      executeSystemInitialize(system);
    }

    this.#initializedSceneSystems.add(sceneName);
  }

  public cleanupSceneSystems(sceneName: string): void {
    const systems = this.#sceneSystems.get(sceneName);
    if (!systems) {
      return;
    }

    for (const system of systems.all) {
      executeSystemCleanup(system);
    }

    this.#initializedSceneSystems.delete(sceneName);
  }

  public getAllSceneSystems(): EngineSystem[] {
    const all: EngineSystem[] = [];
    for (const systems of this.#sceneSystems.values()) {
      all.push(...systems.all);
    }
    return all;
  }

  #sortSystemsForPhase<TSystem extends EngineSystem>(systems: TSystem[]): TSystem[] {
    return systems.sort((a, b) => b.priority - a.priority);
  }
}
