// packages/engine/src/index.ts

import { SystemOpts } from "@engine/core";

export * from "@engine/core";
export * from "@engine/ecs/entity";
export * from "@engine/ecs/hierarchy";
export * from "@engine/ecs/storage";
export * from "@engine/ecs/world";
export * from "@engine/math";
export { Rectangle } from "@engine/math/geometry/rectangle";
export * from "@engine/serialization";
export * from "@engine/systems/input";
export * from "@engine/systems/transformSnapshot";
export * from "@engine/systems/worldTransform2D";

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
