import type { StateSyncCommand } from "@libs/state-sync/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class StateSyncCommandArrayPool {
  readonly #pool: StateSyncCommand[][] = [];

  acquire(): StateSyncCommand[] {
    return this.#pool.pop() ?? [];
  }

  release(commands: StateSyncCommand[]): void {
    commands.length = 0;
    this.#pool.push(commands);
  }
}