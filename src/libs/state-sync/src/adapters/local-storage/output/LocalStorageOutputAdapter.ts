import { LocalStorageBackend } from "@libs/state-sync/adapters/local-storage/backend/LocalStorageBackend";
import type { LocalStorageOutputAdapterOptions } from "@libs/state-sync/adapters/local-storage/types";
import type { SceneStateSyncOutputAdapter, SceneStateSyncOutputAdapterContext } from "@libs/state-sync/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class LocalStorageOutputAdapter implements SceneStateSyncOutputAdapter {
  readonly #backend: LocalStorageBackend;

  constructor(options: LocalStorageOutputAdapterOptions) {
    this.#backend = LocalStorageBackend.instance(options);
  }

  update(context: SceneStateSyncOutputAdapterContext): void {
    if (context.commands.length === 0) {
      return;
    }

    const commands = context.drainCommands();

    for (const command of commands) {
      this.#backend.emit(command);
    }
  }
}