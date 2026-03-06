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

export class ConveyorBeltComponent {
  private readonly leftSlots: ConveyorSlots = [null, null, null, null];
  private readonly rightSlots: ConveyorSlots = [null, null, null, null];

  constructor(
    public variant: string,
    public speed = DEFAULT_CONVEYOR_BELT_SPEED,
  ) {}

  public get left(): Readonly<ConveyorSlots> {
    return this.leftSlots;
  }

  public get right(): Readonly<ConveyorSlots> {
    return this.rightSlots;
  }

  public getEntity(side: ConveyorSide, index: ConveyorSlotIndex): EntityId | null {
    return this.getSlots(side)[index];
  }

  public setEntity(side: ConveyorSide, index: ConveyorSlotIndex, entityId: EntityId): void {
    const slots = this.getSlots(side);

    if (slots[index] !== null) {
      throw new Error(`Conveyor ${this.variant} already has an entity at ${side}[${index}]`);
    }

    slots[index] = entityId;
  }

  private getSlots(side: ConveyorSide): ConveyorSlots {
    if (side === "left") {
      return this.leftSlots;
    }

    return this.rightSlots;
  }
}
