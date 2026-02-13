import type { Transform2D } from "@repo/engine/components";
import {
  getPrimitiveColliderKey,
  type PrimitiveCollider,
  type PrimitiveColliderKey,
} from "../types";
import { circleVsCircle } from "./circle-circle";
import { circleVsRect } from "./circle-rect";
import { rectVsRect } from "./rect-rect";

export type CollisionFn = (
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
) => boolean;

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

export function createCollisionKey(a: PrimitiveColliderKey, b: PrimitiveColliderKey): string {
  return `${a}:${b}`;
}
