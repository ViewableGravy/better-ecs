export class Pool<T> {
  #store: T[] = [];

  constructor(private factory: (pool: Pool<T>) => T) {}

  public acquire(): T {
    return this.#store.pop() ?? this.factory(this);
  }

  public release(item: T) {
    this.#store.push(item);
  }
}