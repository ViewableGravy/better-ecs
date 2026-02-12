export class CommandBuffer<TCommand> {
  private items: TCommand[] = [];

  push(cmd: TCommand): void {
    this.items.push(cmd);
  }

  clear(): void {
    this.items.length = 0;
  }

  sort(compare: (a: TCommand, b: TCommand) => number): void {
    const { items } = this;

    for (let i = 1; i < items.length; i += 1) {
      const current = items[i]!;
      let j = i - 1;

      while (j >= 0 && compare(items[j]!, current) > 0) {
        items[j + 1] = items[j]!;
        j -= 1;
      }

      items[j + 1] = current;
    }
  }

  *[Symbol.iterator](): IterableIterator<TCommand> {
    yield* this.items;
  }
}
