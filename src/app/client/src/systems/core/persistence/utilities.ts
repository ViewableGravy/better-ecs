import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltConnectionUtils } from "@client/entities/transport-belt";
import type { SceneStateSyncLoadContext } from "@libs/state-sync";

export function reconnectPersistedTransportBelts(context: SceneStateSyncLoadContext): void {
  for (const world of context.engine.scene.context.worlds) {
    if ([...world.query(ConveyorBeltComponent)].length === 0) {
      continue;
    }

    TransportBeltConnectionUtils.reconnectAllBelts(world);
  }
}