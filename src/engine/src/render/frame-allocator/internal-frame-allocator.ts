import type { ActivePool, FrameAllocatorRegistry, PoolArgs, PoolValue } from "@engine/render/frame-allocator/types";

export class InternalFrameAllocator<TRegistry extends FrameAllocatorRegistry> {
  readonly #pools = new Map<keyof TRegistry, ActivePool>();
  readonly #scratchArrays = new Map<string, unknown[]>();

  /**
   * Create a frame allocator with a static pool registry.
   *
    * Each registry entry defines how to create and reset a reusable value.
    * Values acquired during a frame stay densely stored per pool and are
    * reused by iterator reset on the next frame.
   */
  constructor(registry: TRegistry) {
    for (const poolName of Object.keys(registry) as Array<keyof TRegistry>) {
      const factory = registry[poolName];
      this.#pools.set(poolName, {
        iterator: 0,
        allocated: [],
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
    * This rewinds pool iterators and clears scratch buffers.
   */
  endFrame(): void {
    this.reset();
  }

  /**
   * Rewind all pool iterators and clear scratch arrays.
   *
   * This is called by both `beginFrame` and `endFrame` so frame boundaries
   * remain robust even when callers recover from errors.
   */
  reset(): void {
    for (const poolState of this.#pools.values()) {
      poolState.iterator = 0;
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
    * The value remains resident in its pool's dense storage and becomes
    * available again after `reset`/`endFrame` rewinds the pool iterator.
   */
  acquire<TKey extends keyof TRegistry>(
    name: TKey,
    ...args: PoolArgs<TRegistry[TKey]>
  ): PoolValue<TRegistry[TKey]> {
    const poolState = this.#pools.get(name);
    if (!poolState) {
      throw new Error(`FrameAllocator pool "${String(name)}" is not registered`);
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
