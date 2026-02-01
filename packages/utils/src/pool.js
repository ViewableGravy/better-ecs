/**
 * Generic object pool for efficient allocation/reuse of objects.
 */
export class Pool {
    factory;
    #store = [];
    constructor(factory) {
        this.factory = factory;
    }
    acquire() {
        return this.#store.pop() ?? this.factory(this);
    }
    release(item) {
        this.#store.push(item);
    }
}
//# sourceMappingURL=pool.js.map