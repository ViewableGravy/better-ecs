import { Vec2, type UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { RectangleCollider } from "@repo/physics";
import { RenderVisibility, type RenderVisibilityRole } from "../components/render-visibility";
import { GridFootprint } from "../systems/build-mode/components/grid-footprint";
import { GridPosition } from "../systems/build-mode/components/grid-position";
import { Placeable } from "../systems/build-mode/components/placeable";

const BOX_SIZE = 20;
const HALF_BOX_SIZE = BOX_SIZE / 2;
const PLACED_FILL = new Color(1, 0.2, 0.8, 1);
const PLACED_STROKE = new Color(1, 1, 1, 1);

type SpawnBoxOptions = {
  snappedX: number;
  snappedY: number;
  renderVisibilityRole: RenderVisibilityRole;
};

export function spawnBox(world: UserWorld, opts: SpawnBoxOptions): number {
  const placed = world.create();
  world.add(placed, new Transform2D(opts.snappedX + HALF_BOX_SIZE, opts.snappedY + HALF_BOX_SIZE));
  world.add(
    placed,
    new Shape(
      "rectangle",
      BOX_SIZE,
      BOX_SIZE,
      new Color(PLACED_FILL.r, PLACED_FILL.g, PLACED_FILL.b, PLACED_FILL.a),
      new Color(PLACED_STROKE.r, PLACED_STROKE.g, PLACED_STROKE.b, PLACED_STROKE.a),
      1,
    ),
  );
  world.add(
    placed,
    new RectangleCollider(new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE), new Vec2(BOX_SIZE, BOX_SIZE)),
  );
  world.add(placed, new GridPosition(opts.snappedX, opts.snappedY));
  world.add(placed, new GridFootprint(BOX_SIZE, BOX_SIZE));
  world.add(placed, new Placeable("box"));
  world.add(placed, new RenderVisibility(opts.renderVisibilityRole, 1));
  return placed;
}
