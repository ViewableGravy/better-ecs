import { StateSyncCommandArrayPool } from "@libs/state-sync/command/pool";
import type { StateSyncCommand } from "@libs/state-sync/types";

type NowFunction = () => number;

const COMPACTION_THRESHOLD = 64;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class StateSyncCommandBuffer {
  readonly #pool = new StateSyncCommandArrayPool();

  #commands = this.#pool.acquire();
  #headIndex = 0;
  #size = 0;

  get size(): number {
    return this.#size;
  }

  push(command: StateSyncCommand): void {
    this.#commands.push(command);
    this.#size += 1;
  }

  consumeWithinBudget(
    consumer: (command: StateSyncCommand) => void,
    budgetMs: number,
    now: NowFunction = defaultNow,
  ): number {
    if (this.#size === 0) {
      return 0;
    }

    const deadline = budgetMs <= 0 ? Number.POSITIVE_INFINITY : now() + budgetMs;
    let processed = 0;

    while (this.#headIndex < this.#commands.length) {
      const command = this.#commands[this.#headIndex];
      if (command) {
        consumer(command);
      }

      this.#headIndex += 1;
      this.#size -= 1;
      processed += 1;

      if (now() >= deadline) {
        break;
      }
    }

    if (this.#headIndex === this.#commands.length) {
      this.reset();
      return processed;
    }

    if (this.#headIndex >= COMPACTION_THRESHOLD && this.#headIndex * 2 >= this.#commands.length) {
      this.compact();
    }

    return processed;
  }

  private reset(): void {
    this.#commands.length = 0;
    this.#headIndex = 0;
  }

  private compact(): void {
    const next = this.#pool.acquire();

    for (let index = this.#headIndex; index < this.#commands.length; index += 1) {
      const command = this.#commands[index];
      if (command) {
        next.push(command);
      }
    }

    const current = this.#commands;
    this.#commands = next;
    this.#headIndex = 0;
    this.#pool.release(current);
  }
}

function defaultNow(): number {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}