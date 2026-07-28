import { Transform2D } from "@engine/components/transform/transform2d";
import type { EntityId } from "@engine/ecs/entity";

export class WorldTransform2D extends Transform2D {
  public parentEntityId: EntityId | null = null;
}