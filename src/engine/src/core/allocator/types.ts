export type PoolFactory<TValue, TArgs extends readonly unknown[]> = {
  create: () => TValue;
  reset(value: TValue, ...args: TArgs): void;
};

export type AllocatorRegistry = Record<string, PoolFactory<unknown, readonly unknown[]>>;

export type MergeAllocatorRegistry<
  TBase extends AllocatorRegistry,
  TUser extends AllocatorRegistry,
> = Omit<TBase, keyof TUser> & TUser;

export type PoolValue<TFactory> =
  TFactory extends PoolFactory<infer TValue, readonly unknown[]> ? TValue : never;

export type PoolArgs<TFactory> =
  TFactory extends PoolFactory<unknown, infer TArgs> ? TArgs : never;

export type ActivePool = {
  iterator: number;
  allocated: unknown[];
  factory: PoolFactory<unknown, readonly unknown[]>;
};