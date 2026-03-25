import type { ConveyorSide, ConveyorSlotIndex } from "@client/components/conveyor-belt";
import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltConnectionUtils } from "@client/entities/transport-belt";
import { BeltItemRailsUtility } from "@client/entities/transport-belt/motion/BeltItemRailsUtility";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import type { SceneStateSyncLoadContext } from "@libs/state-sync";

const CONVEYOR_SIDES: readonly ConveyorSide[] = ["left", "right"];
const CONVEYOR_SLOT_INDICES: readonly ConveyorSlotIndex[] = [0, 1, 2, 3];
const SHARED_BELT_SLOT_POSITION = new Vec2();

export function reconnectPersistedTransportBelts(context: SceneStateSyncLoadContext): void {
  for (const world of context.engine.scene.context.worlds) {
    const beltEntityIds = [...world.query(ConveyorBeltComponent)];

    if (beltEntityIds.length === 0) {
      continue;
    }

    TransportBeltConnectionUtils.reconnectAllBelts(world);
    resetHydratedConveyorVisualState(world, beltEntityIds);
  }
}

function resetHydratedConveyorVisualState(
  world: UserWorld,
  beltEntityIds: readonly EntityId[],
): void {
  for (const beltEntityId of beltEntityIds) {
    const conveyor = world.require(beltEntityId, ConveyorBeltComponent);

    for (const side of CONVEYOR_SIDES) {
      const slots = side === "left" ? conveyor.left : conveyor.right;
      const progress = side === "left" ? conveyor.leftProgress : conveyor.rightProgress;

      for (const index of CONVEYOR_SLOT_INDICES) {
        progress[index] = 0;

        const entityId = slots[index];

        if (entityId === null) {
          continue;
        }

        const transform = world.get(entityId, Transform2D);

        if (!transform) {
          continue;
        }

        BeltItemRailsUtility.resolvePositionInto(conveyor.variant, side, index, 0, SHARED_BELT_SLOT_POSITION);
        transform.curr.pos.x = SHARED_BELT_SLOT_POSITION.x;
        transform.curr.pos.y = SHARED_BELT_SLOT_POSITION.y;
        transform.prev.pos.x = SHARED_BELT_SLOT_POSITION.x;
        transform.prev.pos.y = SHARED_BELT_SLOT_POSITION.y;
      }
    }
  }
}