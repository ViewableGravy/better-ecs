import {
    persistenceInputAdapter,
    persistenceOutputAdapter,
} from "@client/systems/core/persistence/controller";
import { ResetPersistedSceneQuickAction } from "@client/systems/core/persistence/resetPersistedSceneQuickAction";
import { registerQuickAction } from "@engine/ui/quick-actions";
import {
    serializationSystem,
} from "@libs/state-sync";

registerQuickAction({
  id: "client:reset-persisted-scene",
  component: ResetPersistedSceneQuickAction,
  order: 60,
});

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = serializationSystem({
  name: "client:persistence",
  inputAdapter: persistenceInputAdapter,
  outputAdapter: persistenceOutputAdapter,
});