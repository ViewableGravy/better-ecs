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
      const initialSceneState = context.serializeSceneState();

      try {
        context.applySceneState(storedState);
        context.drainDiffCommands();

        if (this.options.onHydrate) {
          await this.options.onHydrate(storedState, context);
        }

        return true;
      } catch (error) {
        console.error("Failed to hydrate IndexedDB scene state. Clearing persisted scene and restoring defaults.", error);

        await this.#backend.clear();

        try {
          context.applySceneState(initialSceneState);
          context.drainDiffCommands();
        } catch (restoreError) {
          console.error("Failed to restore the initial scene state after clearing persisted scene data.", restoreError);
          throw restoreError;
        }

        this.#backend.seed(initialSceneState);
        context.drainDiffCommands();
        return false;
      }
    }

    this.#backend.seed(context.serializeSceneState());
    context.drainDiffCommands();
    return false;
  }
}