import { LocalStorageBackend } from "@libs/state-sync/adapters/local-storage/backend/LocalStorageBackend";
import type { LocalStorageInputAdapterOptions } from "@libs/state-sync/adapters/local-storage/types";
import type { SceneStateSyncLoadAdapter, SceneStateSyncLoadContext } from "@libs/state-sync/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class LocalStorageInputAdapter implements SceneStateSyncLoadAdapter {
  readonly #backend: LocalStorageBackend;

  constructor(private readonly options: LocalStorageInputAdapterOptions) {
    this.#backend = LocalStorageBackend.instance(options);
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