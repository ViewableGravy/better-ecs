import { GridBounds } from "@client/components/grid-bounds";
import { RENDER_LAYERS } from "@client/consts";
import type { Registry } from "@engine";
import { Debug, FillColor, Rgba, Shape, StrokeColor, Transform2D } from "@engine/components";

type SpawnBackgroundOptions = {
  width: number;
  height: number;
  color: Rgba;
  stroke?: Rgba;
  strokeWidth?: number;
  gridBounds?: boolean;
};

export function spawnBackground(world: Registry, opts: SpawnBackgroundOptions): number {
  const entity = world.create();
  const shape = new Shape(
    "rectangle",
    opts.width,
    opts.height,
    opts.strokeWidth ?? 0,
    -100,
    RENDER_LAYERS.background,
  );

  world.add(entity, new Transform2D(0, 0));
  world.add(entity, shape);
  world.add(entity, new FillColor(opts.color));
  if (opts.stroke) {
    world.add(entity, new StrokeColor(opts.stroke));
  }
  world.add(entity, new Debug("background"));

  if (opts.gridBounds) {
    world.add(entity, new GridBounds());
  }

  return entity;
}
