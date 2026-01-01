// packages/engine/src/ecs/world.ts
import type { Entity } from './entity';

export interface World {
  entities: Set<Entity>;
}
