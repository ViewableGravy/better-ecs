import type { ConveyorSide, ConveyorSlotIndex } from "@client/components/conveyor-belt";
import { Vec2 } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type CurveLaneSides = readonly [inside: ConveyorSide | null, outside: ConveyorSide | null];
type SlotAdvanceTicks = readonly [left: number, right: number];

/**********************************************************************************************************
 *   CONSTANTS
 **********************************************************************************************************/

export const CONVEYOR_SIDES: readonly ConveyorSide[] = ["left", "right"];
export const CONVEYOR_SLOT_INDICES_ASC: readonly ConveyorSlotIndex[] = [0, 1, 2, 3];
export const CONVEYOR_SLOT_INDICES_DESC: readonly ConveyorSlotIndex[] = [3, 2, 1, 0];
export const CONVEYOR_SLOT_COUNT_PER_LANE = 4;
export const CONVEYOR_ANIMATION_TICKS_PER_FRAME = 2;
export const SLOT_ADVANCE_TICKS = 16;
export const CONVEYOR_ANIMATION_FRAMES_PER_SLOT = SLOT_ADVANCE_TICKS / CONVEYOR_ANIMATION_TICKS_PER_FRAME;
export const CONVEYOR_ANIMATION_PLAYBACK_RATE = 1 / CONVEYOR_ANIMATION_TICKS_PER_FRAME;
export const INSIDE_CURVE_SPEED_MULTIPLIER = 2;
export const INSIDE_CURVE_SLOT_ADVANCE_TICKS = SLOT_ADVANCE_TICKS / INSIDE_CURVE_SPEED_MULTIPLIER;
export const SHARED_SLOT_POSITION = new Vec2();

const CURVE_LANE_SIDES_BY_VARIANT: Readonly<Record<string, readonly [inside: ConveyorSide, outside: ConveyorSide]>> = {
  "angled-right-up": ["right", "left"],
  "angled-up-right": ["left", "right"],
  "angled-left-up": ["left", "right"],
  "angled-top-left": ["right", "left"],
  "angled-bottom-right": ["right", "left"],
  "angled-right-bottom": ["left", "right"],
  "angled-bottom-left": ["left", "right"],
  "angled-left-bottom": ["right", "left"],
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getCurveLaneSides(variant: string): CurveLaneSides {
  const laneSides = CURVE_LANE_SIDES_BY_VARIANT[variant];

  if (!laneSides) {
    return [null, null];
  }

  return laneSides;
}

export function getSlotAdvanceTicks(variant: string): SlotAdvanceTicks {
  const [insideLaneSide] = getCurveLaneSides(variant);

  if (insideLaneSide === null) {
    return [SLOT_ADVANCE_TICKS, SLOT_ADVANCE_TICKS];
  }

  if (insideLaneSide === "left") {
    return [INSIDE_CURVE_SLOT_ADVANCE_TICKS, SLOT_ADVANCE_TICKS];
  }

  return [SLOT_ADVANCE_TICKS, INSIDE_CURVE_SLOT_ADVANCE_TICKS];
}
