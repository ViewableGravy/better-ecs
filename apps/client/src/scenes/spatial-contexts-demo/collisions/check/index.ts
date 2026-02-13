import {
  getPrimitiveColliderKey,
  type PrimitiveCollider,
  type PrimitiveColliderKey,
} from "../types";
import { circleVsCircle, circleVsRect, rectVsRect, type CollisionFn } from "./narrowphase";

export type CollisionPair = {
  fn: CollisionFn;
  shouldSwap: boolean;
};

const collisionMatrix = new Map<string, CollisionPair>([
  [createCollisionKey("circle", "circle"), { fn: circleVsCircle, shouldSwap: false }],
  [createCollisionKey("circle", "rect"), { fn: circleVsRect, shouldSwap: false }],
  [createCollisionKey("rect", "circle"), { fn: circleVsRect, shouldSwap: true }],
  [createCollisionKey("rect", "rect"), { fn: rectVsRect, shouldSwap: false }],
]);

// prettier-ignore
export function getCollisionFn(
  colliderA: PrimitiveCollider,
  colliderB: PrimitiveCollider,
): CollisionPair | undefined {
  return collisionMatrix.get(
    createCollisionKey(
      getPrimitiveColliderKey(colliderA), 
      getPrimitiveColliderKey(colliderB)
    ),
  );
}

function createCollisionKey(a: PrimitiveColliderKey, b: PrimitiveColliderKey): string {
  return `${a}:${b}`;
}
