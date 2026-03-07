import type { ConveyorSide, ConveyorSlotIndex } from "@client/components/conveyor-belt";
import { Vec2 } from "@engine";

export const CONVEYOR_SIDES: readonly ConveyorSide[] = ["left", "right"];
export const CONVEYOR_SLOT_INDICES_ASC: readonly ConveyorSlotIndex[] = [0, 1, 2, 3];
export const CONVEYOR_SLOT_INDICES_DESC: readonly ConveyorSlotIndex[] = [3, 2, 1, 0];
export const SLOT_ADVANCE_DURATION_MS = 1_075;
export const CONVEYOR_SLOT_COUNT_PER_LANE = 4;
// Keep the user-facing duration tied to a full belt traversal so changing the
// configured value adjusts the observed item speed uniformly across every belt.
export const SLOT_PROGRESS_PER_MILLISECOND = CONVEYOR_SLOT_COUNT_PER_LANE / SLOT_ADVANCE_DURATION_MS;
export const SHARED_SLOT_POSITION = new Vec2();
