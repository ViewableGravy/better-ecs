import type { Pool } from "@repo/utils";

export type FramePoolFactory<TValue, TArgs extends readonly unknown[]> = {
  create: () => TValue;
  reset(value: TValue, ...args: TArgs): void;
};

export type FrameAllocatorRegistry = Record<string, FramePoolFactory<any, readonly unknown[]>>;

export type MergeFrameAllocatorRegistry<
  TBase extends FrameAllocatorRegistry,
  TUser extends FrameAllocatorRegistry,
> = Omit<TBase, keyof TUser> & TUser;

export type PoolValue<TFactory> =
  TFactory extends FramePoolFactory<infer TValue, readonly unknown[]> ? TValue : never;

export type PoolArgs<TFactory> =
  TFactory extends FramePoolFactory<unknown, infer TArgs> ? TArgs : never;

export type ActivePool = {
  pool: Pool<any>;
  active: any[];
  factory: FramePoolFactory<any, readonly unknown[]>;
};
