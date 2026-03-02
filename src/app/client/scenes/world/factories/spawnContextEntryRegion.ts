import type { UserWorld } from "@engine";
import { Rectangle, Vec2 } from "@engine";
import { Debug } from "@engine/components";
import { type ContextId, ContextEntryRegion } from "@lib/spatial-contexts";

type SpawnContextEntryRegionOptions = {
  topLeftX: number;
  topLeftY: number;
  width: number;
  height: number;
  targetContextId: ContextId;
};

export function spawnContextEntryRegion(
  world: UserWorld,
  options: SpawnContextEntryRegionOptions,
): number {
  const entity = world.create();

  world.add(
    entity,
    new ContextEntryRegion(
      options.targetContextId,
      new Rectangle(
        new Vec2(options.topLeftX, options.topLeftY),
        new Vec2(options.width, options.height),
      ),
    ),
  );
  world.add(entity, new Debug("context-entry-region"));

  return entity;
}
