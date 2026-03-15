import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltConnectionUtils } from "@client/entities/transport-belt";
import type { SceneStateSyncLoadContext } from "@libs/state-sync";
import {
    LocalStorageInputAdapter,
    LocalStorageOutputAdapter,
    serializationSystem,
} from "@libs/state-sync";

export const STORAGE_KEY = "better-ecs:scene-state";

function reconnectPersistedTransportBelts(context: SceneStateSyncLoadContext): void {
  for (const world of context.engine.scene.context.worlds) {
    if ([...world.query(ConveyorBeltComponent)].length === 0) {
      continue;
    }

    TransportBeltConnectionUtils.reconnectAllBelts(world);
  }
}

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = serializationSystem({
  name: "client:persistence",
  inputAdapter: new LocalStorageInputAdapter({
    storageKey: STORAGE_KEY,
    onHydrate: (_sceneState, context) => {
      reconnectPersistedTransportBelts(context);
    },
  }),
  outputAdapter: new LocalStorageOutputAdapter({
    storageKey: STORAGE_KEY,
    flushIntervalMs: 1000,
    frameBudgetMs: 0.5,
  }),
});