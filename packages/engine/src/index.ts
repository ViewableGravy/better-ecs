// packages/engine/src/index.ts

import { SystemOpts } from "./core";

export * from "./core";
export * from "./ecs/entity";
export * from "./ecs/hierarchy";
export * from "./ecs/storage";
export * from "./ecs/world";
export * from "./math";
export { Rectangle } from "./math/geometry/rectangle";
export * from "./serialization";
export * from "./systems/input";
export * from "./systems/transformSnapshot";

type AnySystemOpts = Omit<SystemOpts<any, any>, "schema"> & { name: string };
type AnySystems = Record<string, any>;

declare global {
  var __ENGINE_HMR__: {
    register?: (systems: AnySystems) => void;
    registerCallbacks?: (callbacks: {
      executeSystemCleanup: (system: AnySystems[string]) => void;
      executeSystemInitialize: (system: AnySystems[string]) => void;
      reloadActiveScene: () => Promise<void>;
      updateSceneDefinition: (scene: Record<string, unknown>) => boolean;
    }) => void;
    onSystemCreated?: (systemInfo: AnySystemOpts) => void;
    onSceneCreated?: (scene: Record<string, unknown>) => void;
  };
}
