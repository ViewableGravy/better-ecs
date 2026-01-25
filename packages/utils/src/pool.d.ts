/**
 * Generic object pool for efficient allocation/reuse of objects.
 */
export declare class Pool<T> {
    #private;
    private factory;
    constructor(factory: (pool: Pool<T>) => T);
    acquire(): T;
    release(item: T): void;
}
//# sourceMappingURL=pool.d.ts.map