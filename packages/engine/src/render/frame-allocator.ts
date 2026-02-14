import { Pool } from "@repo/utils";

export type FramePoolFactory<TValue, TArgs extends readonly unknown[]> = {
  create: () => TValue;
  reset: (value: TValue, ...args: TArgs) => void;
};

export type FrameAllocatorRegistry = Record<string, FramePoolFactory<unknown, readonly unknown[]>>;

type PoolValue<TFactory> =
  TFactory extends FramePoolFactory<infer TValue, readonly unknown[]> ? TValue : never;

type PoolArgs<TFactory> = TFactory extends FramePoolFactory<unknown, infer TArgs> ? TArgs : never;

type AnyFactory = FramePoolFactory<unknown, readonly unknown[]>;

type ActivePool = {
  pool: Pool<unknown>;
  active: unknown[];
  factory: AnyFactory;
};

export class FrameAllocator<TRegistry extends FrameAllocatorRegistry> {
  readonly #pools = new Map<keyof TRegistry, ActivePool>();

  readonly #scratchArrays = new Map<string, unknown[]>();

  readonly #activeF32: Float32Array[] = [];
  readonly #f32Buckets = new Map<number, Float32Array[]>();

  readonly #activeU32: Uint32Array[] = [];
  readonly #u32Buckets = new Map<number, Uint32Array[]>();

  constructor(registry: TRegistry) {
    for (const poolName of Object.keys(registry) as Array<keyof TRegistry>) {
      // The runtime registry is normalized to an erased factory shape here.
      // This boundary cast is required because each key carries unique generic args.
      const factory = registry[poolName] as AnyFactory;
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

    for (let i = this.#activeF32.length - 1; i >= 0; i -= 1) {
      const buffer = this.#activeF32[i];
      const bucket = this.#f32Buckets.get(buffer.length);
      if (bucket) {
        bucket.push(buffer);
        continue;
      }
      this.#f32Buckets.set(buffer.length, [buffer]);
    }
    this.#activeF32.length = 0;

    for (let i = this.#activeU32.length - 1; i >= 0; i -= 1) {
      const buffer = this.#activeU32[i];
      const bucket = this.#u32Buckets.get(buffer.length);
      if (bucket) {
        bucket.push(buffer);
        continue;
      }
      this.#u32Buckets.set(buffer.length, [buffer]);
    }
    this.#activeU32.length = 0;
  }

  scratch<TValue>(name: string): TValue[] {
    const existing = this.#scratchArrays.get(name);
    if (existing) {
      // Scratch buckets are caller-typed by key convention.
      // The map stores erased arrays to avoid per-key allocations.
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

    // Each key narrows to its registered pool value type at call sites.
    // This cast is confined to the allocator dispatch boundary.
    return value as PoolValue<TRegistry[TKey]>;
  }

  f32(count: number): Float32Array {
    if (count <= 0) {
      return new Float32Array(0);
    }

    const bucket = this.#f32Buckets.get(count);
    const buffer = bucket && bucket.length > 0 ? bucket.pop() : undefined;
    const out = buffer ?? new Float32Array(count);
    this.#activeF32.push(out);
    return out;
  }

  u32(count: number): Uint32Array {
    if (count <= 0) {
      return new Uint32Array(0);
    }

    const bucket = this.#u32Buckets.get(count);
    const buffer = bucket && bucket.length > 0 ? bucket.pop() : undefined;
    const out = buffer ?? new Uint32Array(count);
    this.#activeU32.push(out);
    return out;
  }
}

export function createFrameAllocator<TRegistry extends FrameAllocatorRegistry>(
  registry: TRegistry,
): FrameAllocator<TRegistry> {
  return new FrameAllocator(registry);
}
