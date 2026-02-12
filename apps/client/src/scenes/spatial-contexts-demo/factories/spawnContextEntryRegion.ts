import type { UserWorld } from "@repo/engine";
import { Vec2 } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import type { ContextId } from "@repo/plugins";
import { ContextEntryRegion } from "../components/context-entry-region";

type SpawnContextEntryRegionOptions = {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  targetContextId: ContextId;
};

export function spawnContextEntryRegion(
  world: UserWorld,
  options: SpawnContextEntryRegionOptions,
): number {
  const entity = world.create();

  world.add(entity, new Transform2D(options.x, options.y));
  world.add(
    entity,
    new ContextEntryRegion(
      options.targetContextId,
      new Vec2(options.halfWidth, options.halfHeight),
    ),
  );

  return entity;
}
