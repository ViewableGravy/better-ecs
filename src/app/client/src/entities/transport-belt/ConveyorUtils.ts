import {
    canConveyorStoreEntities,
    ConveyorBeltComponent,
    type ConveyorSide,
    type ConveyorSlotIndex,
} from "@client/components/conveyor-belt";
import {
    getConveyorLaneProgress,
    getConveyorLaneSlots,
    getTransportBeltVariantDescriptor,
} from "@client/entities/transport-belt/core";
import { BeltItemRailsUtility } from "@client/entities/transport-belt/motion/BeltItemRailsUtility";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
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
    conveyorEntityId: TransportBeltEntityId,
    entity: EntityId,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
    progress: number = 0.5,
  ): void {
    const conveyor = world.get(conveyorEntityId, ConveyorBeltComponent);
    const slots = getConveyorLaneSlots(conveyor, side);
    const slotProgress = getConveyorLaneProgress(conveyor, side);

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

    return getTransportBeltVariantDescriptor(variant) !== undefined;
  }
}
