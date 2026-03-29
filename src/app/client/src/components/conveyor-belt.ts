import { getTransportBeltFlow, type TransportBeltDirection } from "@client/entities/transport-belt/consts";
import type { EntityId } from "@engine";
import { Component, StateComponent, state } from "@engine";
import invariant from "tiny-invariant";

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

export function syncConveyorBeltDirectionsFromVariant(conveyor: ConveyorBeltComponent): void {
  const flow = getTransportBeltFlow(conveyor.variant);

  invariant(flow, `No transport belt flow found for variant ${conveyor.variant}`);

  conveyor.tailDirection = flow[0];
  conveyor.headDirection = flow[1];
}

@StateComponent
export class ConveyorBeltComponent extends Component {
  // Slots for physical entities on this belt, separated into left and right lanes based on belt flow direction
  @state("json")
  declare public readonly left: ConveyorSlots;

  @state("json")
  declare public readonly right: ConveyorSlots;

  // Runtime-only interpolation state used for carried-item motion and visuals.
  declare public readonly leftProgress: ConveyorSlotProgress;

  declare public readonly rightProgress: ConveyorSlotProgress;

  declare public leftTailBlocked: boolean;

  declare public rightTailBlocked: boolean;

  // Doubly Linked List style pointers
  @state("json")
  declare public previousEntityId: EntityId | null;

  @state("json")
  declare public nextEntityId: EntityId | null;

  /**
   * Marker used to determine whether this belt is considered a leaf in a belt network. This exists in ADDITION to the presence
   * of the TransportBeltLeaf component, which must always remain in sync with this property. 
   * 
   * This exists in addition to the component due to the nature of the problem. The component acts as an identifyer for querying
   * leafs in the network to perform initial belt iteration, while isLeaf exists for querying during iteration, which would
   * otherwise be an expensive operation for large networks.
   */
  @state("boolean")
  declare public isLeaf: boolean;

  @state("string")
  declare public variant: string;

  @state("string")
  declare public tailDirection: TransportBeltDirection;

  @state("string")
  declare public headDirection: TransportBeltDirection;

  @state("float")
  declare public speed: number;

  constructor(variant = "horizontal-right", speed = DEFAULT_CONVEYOR_BELT_SPEED) {
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
    this.tailDirection = "west";
    this.headDirection = "east";
    syncConveyorBeltDirectionsFromVariant(this);
    this.speed = speed;
  }
}
