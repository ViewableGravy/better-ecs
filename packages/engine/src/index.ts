// packages/engine/src/index.ts

import { EngineSystem, SystemOpts } from './core';

export * from './core';
export * from './ecs/entity';
export * from './ecs/storage';
export * from './ecs/world';
export * from './math';
export * from './serialization';
export * from './systems/transformSnapshot';
export * from './systems/input';

type OnSystemCreatedOpts = Omit<SystemOpts<any, any>, "schema"> & { name: string };

declare global {
  var __ENGINE_HMR__: {
    register?: (systems: Record<string, EngineSystem<any>>) => void;
    onSystemCreated?: (systemInfo: OnSystemCreatedOpts) => void;
  }
}

