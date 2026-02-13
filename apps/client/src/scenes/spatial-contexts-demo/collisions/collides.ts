import type { Transform2D } from "@repo/engine/components";
import { CompoundCollider } from "./colliders/compound";
import { getCollisionFn } from "./collision-matrix";
import { getPrimitiveColliderKey, type Collider, type PrimitiveCollider } from "./types";

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

function collidesInternal(
  a: Collider,
  aTransform: Transform2D,
  b: Collider,
  bTransform: Transform2D,
  pass: number,
): boolean {
  if (a instanceof CompoundCollider) {
    if (!collidesInternal(a.collider, aTransform, b, bTransform, pass)) {
      return false;
    }

    const cacheKey = getCacheKeyCollider(b);
    for (const child of a.children) {
      if (a.hasCheckedPair(child, cacheKey, pass)) {
        continue;
      }

      a.markCheckedPair(child, cacheKey, pass);
      if (collidesInternal(child, aTransform, b, bTransform, pass)) {
        return true;
      }
    }

    return false;
  }

  if (b instanceof CompoundCollider) {
    if (!collidesInternal(a, aTransform, b.collider, bTransform, pass)) {
      return false;
    }

    const cacheKey = getCacheKeyCollider(a);
    for (const child of b.children) {
      if (b.hasCheckedPair(child, cacheKey, pass)) {
        continue;
      }

      b.markCheckedPair(child, cacheKey, pass);
      if (collidesInternal(a, aTransform, child, bTransform, pass)) {
        return true;
      }
    }

    return false;
  }

  const fn = getCollisionFn(a, b);
  if (!fn) {
    warnMissingPair(a, b);
    return false;
  }

  if (fn.shouldSwap) {
    return fn.fn(b, bTransform, a, aTransform);
  }

  return fn.fn(a, aTransform, b, bTransform);
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

  const pairKey = `${getPrimitiveColliderKey(a)}:${getPrimitiveColliderKey(b)}`;
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
