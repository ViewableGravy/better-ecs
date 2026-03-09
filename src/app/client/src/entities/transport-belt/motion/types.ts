import type { ConveyorSide } from "@client/components/conveyor-belt";
import type { EntityId } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type ConveyorSideLoadTransfer = {
  sourceEntityId: EntityId;
  targetEntityId: EntityId;
  targetLane: ConveyorSide;
};
