import invariant from "tiny-invariant";

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
      const current = items[i];
      invariant(current, "CommandBuffer sort invariant violated: missing current item");
      let j = i - 1;

      while (j >= 0) {
        const previous = items[j];
        invariant(previous, "CommandBuffer sort invariant violated: missing previous item");
        if (compare(previous, current) <= 0) {
          break;
        }
        items[j + 1] = previous;
        j -= 1;
      }

      items[j + 1] = current;
    }
  }

  *[Symbol.iterator](): IterableIterator<TCommand> {
    yield* this.items;
  }
}
