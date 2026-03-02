import type { UserWorld } from "@engine";
import { Color, Debug, Shape, Transform2D } from "@engine/components";
import type { ContextId } from "@lib/spatial-contexts";
import { ContextVisualBinding } from "@client/scenes/world/components/context-visual-binding";
import { HOUSE_ROOF, RenderVisibility } from "@client/scenes/world/components/render-visibility";
import { BlendTransition } from "@client/scenes/world/systems/houseTransition/transitionMutator";

type SpawnHouseOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  contextId: ContextId;
};

export function spawnHouse(world: UserWorld, opts: SpawnHouseOptions): number {
  const entity = world.create();

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(
    entity,
    new Shape(
      "rectangle",
      opts.width,
      opts.height,
      new Color(0.43, 0.25, 0.15, 1),
      new Color(0.18, 0.1, 0.07, 1),
      6,
      5,
      0,
    ),
  );
  world.add(entity, new RenderVisibility(HOUSE_ROOF, 1));
  world.add(entity, new ContextVisualBinding(opts.contextId));
  world.add(entity, new BlendTransition(0, 0, 0, 1000, "linear"));
  world.add(entity, new Debug("house"));

  return entity;
}
