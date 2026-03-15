export class Queue<T> {
  readonly #items: T[] = [];

  enqueue(item: T): void {
    this.#items.push(item);
  }

  peek(): readonly T[] {
    return this.#items;
  }

  drain(): T[] {
    if (this.#items.length === 0) {
      return [];
    }

    return this.#items.splice(0, this.#items.length);
  }

  clear(): void {
    this.#items.length = 0;
  }

  get size(): number {
    return this.#items.length;
  }

  pop(): T | undefined {
    return this.#items.pop();
  }
}