import { PlayerComponent } from "@/components/player";
import { Rectangle, createSystem, useWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../components/circle-collider";
import { RectangleCollider } from "../components/rectangle-collider";

export const SceneCollisionSystem = createSystem("demo:spatial-contexts-collision")({
  phase: "update",
  priority: 100,
  system() {
    const world = useWorld();

    const [playerId] = world.query(PlayerComponent);
    if (!playerId) return;

    const playerTransform = world.get(playerId, Transform2D);
    const playerCollider = world.get(playerId, CircleCollider);
    if (!playerTransform || !playerCollider) return;

    for (const colliderId of world.query(CircleCollider, Transform2D)) {
      if (colliderId === playerId) continue;

      const collider = world.get(colliderId, CircleCollider);
      const colliderTransform = world.get(colliderId, Transform2D);
      if (!collider || !colliderTransform) continue;

      resolveCircleVsCircle(playerTransform, playerCollider, colliderTransform, collider);
    }

    for (const colliderId of world.query(RectangleCollider, Transform2D)) {
      if (colliderId === playerId) continue;

      const collider = world.get(colliderId, RectangleCollider);
      const colliderTransform = world.get(colliderId, Transform2D);
      if (!collider || !colliderTransform) continue;

      const worldBounds = collider.bounds.translated(colliderTransform.curr.pos.clone());
      resolveCircleVsRectangle(playerTransform, playerCollider, worldBounds);
    }
  },
});

function resolveCircleVsCircle(
  playerTransform: Transform2D,
  playerCollider: CircleCollider,
  colliderTransform: Transform2D,
  collider: CircleCollider,
): void {
  const dx = playerTransform.curr.pos.x - colliderTransform.curr.pos.x;
  const dy = playerTransform.curr.pos.y - colliderTransform.curr.pos.y;
  const minDistance = playerCollider.radius + collider.radius;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq >= minDistance * minDistance) {
    return;
  }

  const distance = Math.sqrt(distanceSq);
  if (distance === 0) {
    playerTransform.curr.pos.x += minDistance;
    return;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;

  playerTransform.curr.pos.x += nx * overlap;
  playerTransform.curr.pos.y += ny * overlap;
}

function resolveCircleVsRectangle(
  playerTransform: Transform2D,
  playerCollider: CircleCollider,
  bounds: Rectangle,
): void {
  const centerX = playerTransform.curr.pos.x;
  const centerY = playerTransform.curr.pos.y;
  const closestX = clamp(centerX, bounds.left, bounds.right);
  const closestY = clamp(centerY, bounds.top, bounds.bottom);
  const dx = centerX - closestX;
  const dy = centerY - closestY;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq >= playerCollider.radius * playerCollider.radius) {
    return;
  }

  if (distanceSq === 0) {
    resolveCircleInsideRectangle(playerTransform, playerCollider, bounds);
    return;
  }

  const distance = Math.sqrt(distanceSq);
  const overlap = playerCollider.radius - distance;
  const nx = dx / distance;
  const ny = dy / distance;

  playerTransform.curr.pos.x += nx * overlap;
  playerTransform.curr.pos.y += ny * overlap;
}

function resolveCircleInsideRectangle(
  playerTransform: Transform2D,
  playerCollider: CircleCollider,
  bounds: Rectangle,
): void {
  const x = playerTransform.curr.pos.x;
  const y = playerTransform.curr.pos.y;
  const toLeft = x - bounds.left;
  const toRight = bounds.right - x;
  const toTop = y - bounds.top;
  const toBottom = bounds.bottom - y;

  const minHorizontal = Math.min(toLeft, toRight);
  const minVertical = Math.min(toTop, toBottom);

  if (minHorizontal <= minVertical) {
    if (toLeft <= toRight) {
      playerTransform.curr.pos.x = bounds.left - playerCollider.radius;
      return;
    }

    playerTransform.curr.pos.x = bounds.right + playerCollider.radius;
    return;
  }

  if (toTop <= toBottom) {
    playerTransform.curr.pos.y = bounds.top - playerCollider.radius;
    return;
  }

  playerTransform.curr.pos.y = bounds.bottom + playerCollider.radius;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
