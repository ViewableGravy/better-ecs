import {
  canConveyorStoreEntities,
  ConveyorBeltComponent,
  type ConveyorSide,
  type ConveyorSlotIndex,
} from "@client/components/conveyor-belt";
import { CONVEYOR_SLOT_POSITIONS, getTransportBeltFlow } from "@client/entities/transport-belt/consts";
import { BeltItemRailsUtility } from "@client/entities/transport-belt/utils/rails";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import invariant from "tiny-invariant";

const SHARED_ADD_ENTITY_POSITION = new Vec2();

export class ConveyorUtils {
  /**
   * Parents an entity to a conveyor and places it into a specific lane slot.
   */
  public static addEntity(
    world: UserWorld,
    conveyorEntityId: EntityId,
    entity: EntityId,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
    progress: number = 0.5,
  ): void {
    const conveyor = world.require(conveyorEntityId, ConveyorBeltComponent);
    const slots = this.resolveSlots(conveyor, side);
    const slotProgress = this.resolveSlotProgress(conveyor, side);

    invariant(
      canConveyorStoreEntities(conveyor.variant),
      `Conveyor ${conveyor.variant} is visual-only and cannot store entities`,
    );
    invariant(
      slots[index] === null,
      `Conveyor ${conveyor.variant} already has an entity at ${side}[${index}]`,
    );

    BeltItemRailsUtility.resolvePositionInto(
      conveyor.variant,
      side,
      index,
      progress,
      SHARED_ADD_ENTITY_POSITION,
    );

    world.add(entity, new Parent(conveyorEntityId));
    world.add(entity, new Transform2D(SHARED_ADD_ENTITY_POSITION.x, SHARED_ADD_ENTITY_POSITION.y, 0));

    slots[index] = entity;
    slotProgress[index] = progress;
  }

  /**
   * Temporary until all belt variants support carried entities and motion.
   */
  public static supportsItemAnimation(variant: string): boolean {
    if (!canConveyorStoreEntities(variant)) {
      return false;
    }

    return getTransportBeltFlow(variant) !== undefined;
  }

  /**
   * Resolves the static center position of a slot on the local belt transform.
   */
  public static resolveSlotLocalPosition(
    variant: string,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
  ): readonly [number, number] {
    const mappedPosition = CONVEYOR_SLOT_POSITIONS[`${variant}:${side}:${index}`];

    invariant(mappedPosition, `No slot position found for variant ${variant}, side ${side}, index ${index}`);

    return mappedPosition;
  }

  private static resolveSlots(conveyor: ConveyorBeltComponent, side: ConveyorSide): ConveyorBeltComponent["left"] {
    if (side === "left") {
      return conveyor.left;
    }

    return conveyor.right;
  }

  private static resolveSlotProgress(conveyor: ConveyorBeltComponent, side: ConveyorSide): ConveyorBeltComponent["leftProgress"] {
    if (side === "left") {
      return conveyor.leftProgress;
    }

    return conveyor.rightProgress;
  }
}
