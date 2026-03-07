import type { EntityId } from "@engine";

export const DEFAULT_CONVEYOR_BELT_SPEED = 19;

export type ConveyorSide = "left" | "right";
export type ConveyorSlotIndex = 0 | 1 | 2 | 3;
export type ConveyorSlots = [
  EntityId | null,
  EntityId | null,
  EntityId | null,
  EntityId | null,
];
export type ConveyorSlotProgress = [number, number, number, number];

export function canConveyorStoreEntities(variant: string): boolean {
  return !variant.startsWith("start-") && !variant.startsWith("end-");
}

export class ConveyorBeltComponent {
  public readonly left: ConveyorSlots = [null, null, null, null];
  public readonly right: ConveyorSlots = [null, null, null, null];
  public readonly leftProgress: ConveyorSlotProgress = [0, 0, 0, 0];
  public readonly rightProgress: ConveyorSlotProgress = [0, 0, 0, 0];

  constructor(
    public readonly variant: string,
    public speed = DEFAULT_CONVEYOR_BELT_SPEED,
  ) {}
}
