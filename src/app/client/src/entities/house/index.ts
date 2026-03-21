import { ContextVisualBinding } from "@client/components/context-visual-binding";
import { HOUSE_ROOF, RenderVisibility } from "@client/components/render-visibility";
import { BlendTransition } from "@client/systems/world/house-transition/transitionMutator";
import type { UserWorld } from "@engine";
import { Debug, FillColor, Rgba, Shape, StrokeColor, Transform2D } from "@engine/components";
import type { ContextId } from "@libs/spatial-contexts";

type SpawnHouseOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  contextId: ContextId;
};

export function spawnHouse(world: UserWorld, opts: SpawnHouseOptions): number {
  const entity = world.create();
  const shape = new Shape("rectangle", opts.width, opts.height, 6, 5, 0);

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(entity, shape);
  world.add(entity, new FillColor(new Rgba(0.43, 0.25, 0.15, 1)));
  world.add(entity, new StrokeColor(new Rgba(0.18, 0.1, 0.07, 1)));
  world.add(entity, new RenderVisibility(HOUSE_ROOF, 1));
  world.add(entity, new ContextVisualBinding(opts.contextId));
  world.add(entity, new BlendTransition(0, 0, 0, 1000, "linear"));
  world.add(entity, new Debug("house"));

  return entity;
}
