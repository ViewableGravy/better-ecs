// packages/engine/src/ecs/storage.ts
import type { Entity } from './entity';

export type ComponentStore<T> = Map<Entity, T>;
