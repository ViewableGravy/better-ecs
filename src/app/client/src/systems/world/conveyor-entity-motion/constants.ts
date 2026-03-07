import type { ConveyorSide, ConveyorSlotIndex } from "@client/components/conveyor-belt";
import { Vec2 } from "@engine";

export const CONVEYOR_SIDES: readonly ConveyorSide[] = ["left", "right"];
export const CONVEYOR_SLOT_INDICES_ASC: readonly ConveyorSlotIndex[] = [0, 1, 2, 3];
export const CONVEYOR_SLOT_INDICES_DESC: readonly ConveyorSlotIndex[] = [3, 2, 1, 0];
export const DEMO_SLOT_ADVANCE_DURATION_MS = 1_075;
export const DEMO_SLOT_PROGRESS_PER_MILLISECOND = 1 / DEMO_SLOT_ADVANCE_DURATION_MS;
export const SHARED_SLOT_POSITION = new Vec2();
