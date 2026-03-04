import { RenderVisibility, type RenderVisibilityRole } from "@client/components/render-visibility";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { GridFootprint } from "@client/systems/world/build-mode/components/grid-footprint";
import { GridPosition } from "@client/systems/world/build-mode/components/grid-position";
import { Placeable } from "@client/systems/world/build-mode/components/placeable";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { Vec2, type UserWorld } from "@engine";
import { Color, Debug, Shape, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";

const BOX_SIZE = 20;
const HALF_BOX_SIZE = BOX_SIZE / 2;
const GRID_COLLIDER_INSET_PX = 1;
const INSET_BOX_SIZE = BOX_SIZE - GRID_COLLIDER_INSET_PX * 2;
const INSET_HALF_BOX_SIZE = HALF_BOX_SIZE - GRID_COLLIDER_INSET_PX;
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
    new RectangleCollider(
      new Vec2(-INSET_HALF_BOX_SIZE, -INSET_HALF_BOX_SIZE),
      new Vec2(INSET_BOX_SIZE, INSET_BOX_SIZE),
    ),
  );
  world.add(placed, CollisionProfiles.solid());
  const [gridX, gridY] = GridSingleton.worldToGridCoordinates(opts.snappedX, opts.snappedY);
  world.add(placed, new GridPosition(gridX, gridY));
  world.add(placed, new GridFootprint(BOX_SIZE, BOX_SIZE));
  world.add(placed, new Placeable("box"));
  world.add(placed, new RenderVisibility(opts.renderVisibilityRole, 1));
  world.add(placed, new Debug("box"));
  return placed;
}
