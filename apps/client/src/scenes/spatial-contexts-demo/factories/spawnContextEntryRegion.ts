import type { UserWorld } from "@repo/engine";
import { Rectangle, Vec2 } from "@repo/engine";
import type { ContextId } from "@repo/spatial-contexts";
import { ContextEntryRegion } from "../components/context-entry-region";

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

  return entity;
}
