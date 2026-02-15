import { Vec2, type UserWorld } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";
import { CircleCollider, RectangleCollider, collides, getEntityCollider } from "@repo/physics";
import { GridFootprint, GridPosition, Placeable } from "./components";
import { BOX_SIZE, DELETE_POINT_RADIUS, GRID_CELL_SIZE, HALF_BOX_SIZE, PLACED_FILL, PLACED_STROKE } from "./const";

const placementCollider = new RectangleCollider(
  new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE),
  new Vec2(BOX_SIZE, BOX_SIZE),
);
const placementTransform = new Transform2D(0, 0);
const deletePointCollider = new CircleCollider(DELETE_POINT_RADIUS);
const deletePointTransform = new Transform2D(0, 0);

export function snapToGrid(value: number): number {
  return Math.floor(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
}

export function deleteAt(world: UserWorld, worldX: number, worldY: number): void {
  deletePointTransform.curr.pos.set(worldX, worldY);
  deletePointTransform.prev.pos.set(worldX, worldY);

  for (const entityId of world.query(Transform2D)) {
    const transform = world.get(entityId, Transform2D);
    if (!transform) {
      continue;
    }

    const collider = getEntityCollider(world, entityId);
    if (!collider) {
      continue;
    }

    if (!collides(deletePointCollider, deletePointTransform, collider, transform)) {
      continue;
    }

    world.destroy(entityId);
    return;
  }
}

export function placeBox(world: UserWorld, snappedX: number, snappedY: number): void {
  if (!canPlaceBox(world, snappedX, snappedY)) {
    return;
  }

  const placed = world.create();
  world.add(placed, new Transform2D(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE));
  world.add(placed, new Shape("rectangle", BOX_SIZE, BOX_SIZE, PLACED_FILL, PLACED_STROKE, 1));
  world.add(
    placed,
    new RectangleCollider(new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE), new Vec2(BOX_SIZE, BOX_SIZE)),
  );
  world.add(placed, new GridPosition(snappedX, snappedY));
  world.add(placed, new GridFootprint(BOX_SIZE, BOX_SIZE));
  world.add(placed, new Placeable("box"));
}

function canPlaceBox(world: UserWorld, snappedX: number, snappedY: number): boolean {
  placementTransform.curr.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);
  placementTransform.prev.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);

  for (const entityId of world.query(Transform2D)) {
    const transform = world.get(entityId, Transform2D);
    if (!transform) {
      continue;
    }

    const collider = getEntityCollider(world, entityId);
    if (!collider) {
      continue;
    }

    if (collides(placementCollider, placementTransform, collider, transform)) {
      return false;
    }
  }

  return true;
}
