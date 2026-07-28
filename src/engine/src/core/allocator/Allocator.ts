import type { ActivePool, AllocatorRegistry, PoolArgs, PoolValue } from "@engine/core/allocator/types";

export class Allocator<TRegistry extends AllocatorRegistry> {
  readonly #pools = new Map<keyof TRegistry, ActivePool>();
  readonly #scratchArrays = new Map<string, unknown[]>();

  public constructor(registry: TRegistry) {
    for (const poolName of Object.keys(registry) as Array<keyof TRegistry>) {
      const factory = registry[poolName];
      this.#pools.set(poolName, {
        iterator: 0,
        allocated: [],
        factory,
      });
    }
  }

  public beginFrame(): void {
    this.reset();
  }

  public endFrame(): void {
    this.reset();
  }

  public beginCycle(): void {
    this.reset();
  }

  public endCycle(): void {
    this.reset();
  }

  public reset(): void {
    for (const poolState of this.#pools.values()) {
      poolState.iterator = 0;
    }

    for (const scratch of this.#scratchArrays.values()) {
      scratch.length = 0;
    }
  }

  public scratch<TValue>(name: string): TValue[] {
    const existing = this.#scratchArrays.get(name);
    if (existing) {
      return existing as TValue[];
    }

    const created: TValue[] = [];
    this.#scratchArrays.set(name, created);
    return created;
  }

  public acquire<TKey extends keyof TRegistry>(
    name: TKey,
    ...args: PoolArgs<TRegistry[TKey]>
  ): PoolValue<TRegistry[TKey]> {
    const poolState = this.#pools.get(name);

    if (!poolState) {
      throw new Error(`Allocator pool "${String(name)}" is not registered`);
    }

    const index = poolState.iterator;
    const value = index < poolState.allocated.length
      ? poolState.allocated[index]
      : poolState.factory.create();

    if (index >= poolState.allocated.length) {
      poolState.allocated.push(value);
    }

    poolState.iterator = index + 1;
    poolState.factory.reset(value, ...args);

    return value as PoolValue<TRegistry[TKey]>;
  }
}