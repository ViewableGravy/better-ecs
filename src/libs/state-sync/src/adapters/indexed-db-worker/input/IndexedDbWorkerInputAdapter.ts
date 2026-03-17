import type { SceneStateSyncLoadAdapter, SceneStateSyncLoadContext } from "@libs/state-sync/types";

import { IndexedDbWorkerBackend } from "@libs/state-sync/adapters/indexed-db-worker/backend/IndexedDbWorkerBackend";
import type { IndexedDbWorkerInputAdapterOptions } from "@libs/state-sync/adapters/indexed-db-worker/types";

export class IndexedDbWorkerInputAdapter implements SceneStateSyncLoadAdapter {
  readonly #backend: IndexedDbWorkerBackend;

  constructor(private readonly options: IndexedDbWorkerInputAdapterOptions) {
    this.#backend = IndexedDbWorkerBackend.instance(options);
  }

  async load(context: SceneStateSyncLoadContext): Promise<boolean> {
    const storedState = await this.#backend.load();

    if (storedState) {
      context.applySceneState(storedState);
      context.drainDiffCommands();

      if (this.options.onHydrate) {
        await this.options.onHydrate(storedState, context);
      }

      return true;
    }

    this.#backend.seed(context.serializeSceneState());
    context.drainDiffCommands();
    return false;
  }
}