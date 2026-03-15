import { Serializable, serializable } from "@engine";
import type { PrimitiveCollider } from "@libs/physics/types";

export class CompoundCollider extends Serializable {
  private readonly checkedPairs = new WeakMap<
    PrimitiveCollider,
    WeakMap<PrimitiveCollider, number>
  >();

  @serializable("json")
  public readonly collider: PrimitiveCollider;

  @serializable("json")
  public readonly children: PrimitiveCollider[];

  public constructor(collider: PrimitiveCollider, children: PrimitiveCollider[]) {
    super();
    this.collider = collider;
    this.children = children;
  }

  public hasCheckedPair(
    child: PrimitiveCollider,
    other: PrimitiveCollider,
    collisionPass: number,
  ): boolean {
    const childMap = this.checkedPairs.get(child);
    if (!childMap) {
      return false;
    }

    return childMap.get(other) === collisionPass;
  }

  public markCheckedPair(
    child: PrimitiveCollider,
    other: PrimitiveCollider,
    collisionPass: number,
  ): void {
    const existing = this.checkedPairs.get(child);
    if (existing) {
      existing.set(other, collisionPass);
      return;
    }

    const childMap = new WeakMap<PrimitiveCollider, number>();
    childMap.set(other, collisionPass);
    this.checkedPairs.set(child, childMap);
  }
}
