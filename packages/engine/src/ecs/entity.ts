// packages/engine/src/ecs/entity.ts
import type { Tagged } from 'type-fest';

export type Entity = Tagged<number, 'Entity'>;

let nextEntityId = 0;

export function createEntity(): Entity {
  return nextEntityId++ as Entity;
}
