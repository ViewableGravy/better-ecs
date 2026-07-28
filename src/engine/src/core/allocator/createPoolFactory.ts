import type { PoolFactory } from "@engine/core/allocator/types";

export function createPoolFactory<TValue, TArgs extends readonly unknown[]>(
  create: () => TValue,
  reset: (value: TValue, ...args: TArgs) => void,
): PoolFactory<TValue, TArgs> {
  return {
    create,
    reset,
  };
}