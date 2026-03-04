import { ConveyorBeltComponent, type ConveyorSide, type ConveyorSlotIndex } from "@client/components/conveyor-belt";
import { CONVEYOR_SLOT_POSITIONS } from "@client/scenes/world/utilities/slot-lookup";
import type { EntityId, UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import invariant from "tiny-invariant";

export class ConveyorUtils {
  public static addEntity(
    world: UserWorld,
    conveyorEntityId: EntityId,
    entity: EntityId,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
  ): void {
    const conveyor = world.require(conveyorEntityId, ConveyorBeltComponent);

    const [x, y] = ConveyorUtils.resolveSlotLocalPosition(conveyor.variant, side, index);

    world.add(entity, new Parent(conveyorEntityId));
    world.add(entity, new Transform2D(x, y, 0));
    conveyor.setEntity(side, index, entity);
  }

  private static resolveSlotLocalPosition(
    variant: string,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
  ): readonly [number, number] {
    const mappedPosition = CONVEYOR_SLOT_POSITIONS[`${variant}:${side}:${index}`];

    invariant(mappedPosition, `No slot position found for variant ${variant}, side ${side}, index ${index}`);

    return mappedPosition;
  }
}