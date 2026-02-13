import type { Transform2D } from "@repo/engine/components";
import { CompoundCollider } from "../colliders/compound";
import { type Collider, type PrimitiveCollider } from "../types";
import { getPrimitiveColliderKey } from "../utils";
import { createCollisionKey, getCollisionFn } from "./matrix";

export { createCollisionKey, getCollisionFn };

type Collides = (
  a: Collider,
  aTransform: Transform2D,
  b: Collider,
  bTransform: Transform2D,
) => boolean;

const warnedPairs = new Set<string>();
let collisionPass = 0;

export const collides: Collides = (a, aTransform, b, bTransform) => {
  collisionPass += 1;
  return collidesInternal(a, aTransform, b, bTransform, collisionPass);
};

function collidesCompound(
  compound: CompoundCollider,
  compoundTransform: Transform2D,
  other: Collider,
  otherTransform: Transform2D,
  pass: number,
): boolean {
  if (!collidesInternal(compound.collider, compoundTransform, other, otherTransform, pass)) {
    return false;
  }

  const cacheKey = getCacheKeyCollider(other);
  for (const child of compound.children) {
    if (compound.hasCheckedPair(child, cacheKey, pass)) {
      continue;
    }

    compound.markCheckedPair(child, cacheKey, pass);
    if (collidesInternal(child, compoundTransform, other, otherTransform, pass)) {
      return true;
    }
  }

  return false;
}

function collidesInternal(
  a: Collider,
  aTransform: Transform2D,
  b: Collider,
  bTransform: Transform2D,
  pass: number,
): boolean {
  if (a instanceof CompoundCollider) {
    return collidesCompound(a, aTransform, b, bTransform, pass);
  }

  if (b instanceof CompoundCollider) {
    return collidesCompound(b, bTransform, a, aTransform, pass);
  }

  const collisionPair = getCollisionFn(a, b);

  if (!collisionPair) {
    warnMissingPair(a, b);
    return false;
  }

  if (collisionPair.shouldSwap) {
    return collisionPair.fn(b, bTransform, a, aTransform);
  }

  return collisionPair.fn(a, aTransform, b, bTransform);
}

function getCacheKeyCollider(collider: Collider): PrimitiveCollider {
  if (collider instanceof CompoundCollider) {
    return collider.collider;
  }

  return collider;
}

function warnMissingPair(a: PrimitiveCollider, b: PrimitiveCollider): void {
  if (!isDevelopmentBuild()) {
    return;
  }

  // prettier-ignore
  const pairKey = createCollisionKey(getPrimitiveColliderKey(a), getPrimitiveColliderKey(b));

  if (warnedPairs.has(pairKey)) {
    return;
  }

  warnedPairs.add(pairKey);
  console.warn("Missing collision pair:", pairKey);
}

function isDevelopmentBuild(): boolean {
  if (typeof process === "undefined") {
    return true;
  }

  if (!process.env) {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}
