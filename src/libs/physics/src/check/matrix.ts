import type { Transform2D } from "@engine/components";
import { type PrimitiveCollider, type PrimitiveColliderKey } from "@libs/physics/types";
import { getPrimitiveColliderKey } from "@libs/physics/utils";
import { circleVsCircle } from "@libs/physics/check/circle-circle";
import { circleVsRect } from "@libs/physics/check/circle-rect";
import { pointVsCircle } from "@libs/physics/check/point-circle";
import { pointVsPoint } from "@libs/physics/check/point-point";
import { pointVsRect } from "@libs/physics/check/point-rect";
import { rectVsRect } from "@libs/physics/check/rect-rect";

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
  [createCollisionKey("point", "circle"), { fn: pointVsCircle, shouldSwap: false }],
  [createCollisionKey("point", "rect"), { fn: pointVsRect, shouldSwap: false }],
  [createCollisionKey("point", "point"), { fn: pointVsPoint, shouldSwap: false }],
  [createCollisionKey("rect", "circle"), { fn: circleVsRect, shouldSwap: true }],
  [createCollisionKey("circle", "point"), { fn: pointVsCircle, shouldSwap: true }],
  [createCollisionKey("rect", "point"), { fn: pointVsRect, shouldSwap: true }],
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
