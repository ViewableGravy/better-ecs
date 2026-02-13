import type { PrimitiveCollider } from "../types";

export class CompoundCollider {
  private readonly checkedPairs = new WeakMap<
    PrimitiveCollider,
    WeakMap<PrimitiveCollider, number>
  >();

  public constructor(
    public readonly collider: PrimitiveCollider,
    public readonly children: PrimitiveCollider[],
  ) {}

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
