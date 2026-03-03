import { Pool } from "@utils";
import type { ActivePool, FrameAllocatorRegistry, PoolArgs, PoolValue } from "@engine/render/frame-allocator/types";

export class InternalFrameAllocator<TRegistry extends FrameAllocatorRegistry> {
  readonly #pools = new Map<keyof TRegistry, ActivePool>();
  readonly #scratchArrays = new Map<string, unknown[]>();

  /**
   * Create a frame allocator with a static pool registry.
   *
   * Each registry entry defines how to create and reset a pooled value.
   * Values acquired during a frame are automatically released on `endFrame`.
   */
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

  /**
   * Begin a new frame lifecycle.
   *
   * This clears any outstanding values from the previous frame before
   * new acquisitions start.
   */
  beginFrame(): void {
    this.reset();
  }

  /**
   * End the current frame lifecycle.
   *
   * This releases all acquired pooled values and clears scratch buffers.
   */
  endFrame(): void {
    this.reset();
  }

  /**
   * Release all currently acquired pooled values and clear scratch arrays.
   *
   * This is called by both `beginFrame` and `endFrame` so frame boundaries
   * remain robust even when callers recover from errors.
   */
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

  /**
   * Get a reusable temporary array for the current frame.
   *
   * Scratch arrays are keyed by name, reused between frames, and auto-cleared
   * during `reset`. Use this for transient list-building without per-frame
   * array allocations.
   */
  scratch<TValue>(name: string): TValue[] {
    const existing = this.#scratchArrays.get(name);
    if (existing) {
      return existing as TValue[];
    }

    const created: TValue[] = [];
    this.#scratchArrays.set(name, created);
    return created;
  }

  /**
   * Acquire a pooled value from a named pool and reset it for immediate use.
   *
   * The value remains active until `reset`/`endFrame`, where it is returned
   * to its pool.
   */
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
