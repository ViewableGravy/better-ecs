import type { SceneStateSyncOutputAdapter, SceneStateSyncOutputAdapterContext } from "@libs/state-sync/types";

import { IndexedDbWorkerBackend } from "@libs/state-sync/adapters/indexed-db-worker/backend/IndexedDbWorkerBackend";
import type { IndexedDbWorkerOutputAdapterOptions } from "@libs/state-sync/adapters/indexed-db-worker/types";

export class IndexedDbWorkerOutputAdapter implements SceneStateSyncOutputAdapter {
  readonly #backend: IndexedDbWorkerBackend;

  constructor(options: IndexedDbWorkerOutputAdapterOptions) {
    this.#backend = IndexedDbWorkerBackend.instance(options);
  }

  async clear(): Promise<void> {
    await this.#backend.clear();
  }

  update(context: SceneStateSyncOutputAdapterContext): void {
    if (context.commands.length === 0) {
      return;
    }

    this.#backend.emitBatch(context.drainCommands());
  }
}