import type { EntityId } from "@engine";
import { Component, SerializableComponent, serializable } from "@engine";

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

@SerializableComponent
export class ConveyorBeltComponent extends Component {
  // Slots for physical entities on this belt, separated into left and right lanes based on belt flow direction
  @serializable("json")
  declare public readonly left: ConveyorSlots;

  @serializable("json")
  declare public readonly right: ConveyorSlots;

  // Visual progress of entities in their slots
  @serializable("json")
  declare public readonly leftProgress: ConveyorSlotProgress;

  @serializable("json")
  declare public readonly rightProgress: ConveyorSlotProgress;

  // Tracks whether a tail-slot item is currently hard-stopped at the belt seam.
  @serializable("boolean")
  declare public leftTailBlocked: boolean;

  @serializable("boolean")
  declare public rightTailBlocked: boolean;

  // Doubly Linked List style pointers
  @serializable("json")
  declare public previousEntityId: EntityId | null;

  @serializable("json")
  declare public nextEntityId: EntityId | null;

  /**
   * Marker used to determine whether this belt is considered a leaf in a belt network. This exists in ADDITION to the presence
   * of the TransportBeltLeaf component, which must always remain in sync with this property. 
   * 
   * This exists in addition to the component due to the nature of the problem. The component acts as an identifyer for querying
   * leafs in the network to perform initial belt iteration, while isLeaf exists for querying during iteration, which would
   * otherwise be an expensive operation for large networks.
   */
  @serializable("boolean")
  declare public isLeaf: boolean;

  @serializable("string")
  declare public variant: string;

  @serializable("float")
  declare public speed: number;

  constructor(variant: string, speed = DEFAULT_CONVEYOR_BELT_SPEED) {
    super();
    this.left = [null, null, null, null];
    this.right = [null, null, null, null];
    this.leftProgress = [0, 0, 0, 0];
    this.rightProgress = [0, 0, 0, 0];
    this.leftTailBlocked = false;
    this.rightTailBlocked = false;
    this.previousEntityId = null;
    this.nextEntityId = null;
    this.isLeaf = false;
    this.variant = variant;
    this.speed = speed;
  }
}
