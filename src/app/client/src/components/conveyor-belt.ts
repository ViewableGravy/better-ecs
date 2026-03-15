import type { EntityId } from "@engine";
import { Serializable, serializable } from "@engine";

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

export class ConveyorBeltComponent extends Serializable {
  // Slots for physical entities on this belt, separated into left and right lanes based on belt flow direction
  @serializable("json")
  public readonly left: ConveyorSlots = [null, null, null, null];

  @serializable("json")
  public readonly right: ConveyorSlots = [null, null, null, null];

  // Visual progress of entities in their slots
  @serializable("json")
  public readonly leftProgress: ConveyorSlotProgress = [0, 0, 0, 0];

  @serializable("json")
  public readonly rightProgress: ConveyorSlotProgress = [0, 0, 0, 0];

  // Tracks whether a tail-slot item is currently hard-stopped at the belt seam.
  @serializable("boolean")
  public leftTailBlocked = false;

  @serializable("boolean")
  public rightTailBlocked = false;

  // Doubly Linked List style pointers
  @serializable("json")
  public previousEntityId: EntityId | null = null;

  @serializable("json")
  public nextEntityId: EntityId | null = null;

  /**
   * Marker used to determine whether this belt is considered a leaf in a belt network. This exists in ADDITION to the presence
   * of the TransportBeltLeaf component, which must always remain in sync with this property. 
   * 
   * This exists in addition to the component due to the nature of the problem. The component acts as an identifyer for querying
   * leafs in the network to perform initial belt iteration, while isLeaf exists for querying during iteration, which would
   * otherwise be an expensive operation for large networks.
   */
  @serializable("boolean")
  public isLeaf = false;

  @serializable("string")
  public variant: string;

  @serializable("float")
  public speed: number;

  constructor(variant: string, speed = DEFAULT_CONVEYOR_BELT_SPEED) {
    super();
    this.variant = variant;
    this.speed = speed;
  }
}
