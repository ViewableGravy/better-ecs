import { Pool } from "@repo/utils";
import type { ActivePool, FrameAllocatorRegistry, PoolArgs, PoolValue } from "./types";

export class FrameAllocator<TRegistry extends FrameAllocatorRegistry> {
  readonly #pools = new Map<keyof TRegistry, ActivePool>();
  readonly #scratchArrays = new Map<string, unknown[]>();

  constructor(registry: TRegistry) {
    for (const poolName of Object.keys(registry) as Array<keyof TRegistry>) {
      const factory = registry[poolName];
      this.#pools.set(poolName, {
        pool: new Pool(() => factory.create()),
        active: [],
        factory,
      });
    }
  }

  beginFrame(): void {
    this.reset();
  }

  endFrame(): void {
    this.reset();
  }

  reset(): void {
    for (const poolState of this.#pools.values()) {
      const { pool, active } = poolState;
      for (let i = active.length - 1; i >= 0; i -= 1) {
        const item = active[i];
        if (item !== undefined) {
          pool.release(item);
        }
      }
      active.length = 0;
    }

    for (const scratch of this.#scratchArrays.values()) {
      scratch.length = 0;
    }
  }

  scratch<TValue>(name: string): TValue[] {
    const existing = this.#scratchArrays.get(name);
    if (existing) {
      return existing as TValue[];
    }

    const created: TValue[] = [];
    this.#scratchArrays.set(name, created);
    return created;
  }

  acquire<TKey extends keyof TRegistry>(
    name: TKey,
    ...args: PoolArgs<TRegistry[TKey]>
  ): PoolValue<TRegistry[TKey]> {
    const poolState = this.#pools.get(name);
    if (!poolState) {
      throw new Error(`FrameAllocator pool "${String(name)}" is not registered`);
    }

    const value = poolState.pool.acquire();
    poolState.factory.reset(value, ...args);
    poolState.active.push(value);

    return value as PoolValue<TRegistry[TKey]>;
  }
}
