import { ConveyorBeltComponent, type ConveyorSide, type ConveyorSlotIndex } from "@client/components/conveyor-belt";
import type { EntityId, UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";

const SLOT_AXIS_OFFSETS: readonly [number, number, number, number] = [-7.5, -2.5, 2.5, 7.5];
const SLOT_SIDE_OFFSET = 4;

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
  ): [number, number] {
    const axisOffset = SLOT_AXIS_OFFSETS[index];

    if (ConveyorUtils.isHorizontalVariant(variant)) {
      return [axisOffset, side === "left" ? -SLOT_SIDE_OFFSET : SLOT_SIDE_OFFSET];
    }

    if (ConveyorUtils.isVerticalVariant(variant)) {
      return [side === "left" ? -SLOT_SIDE_OFFSET : SLOT_SIDE_OFFSET, axisOffset];
    }

    throw new Error(`Conveyor variant ${variant} is not supported for belt item placement yet`);
  }

  private static isHorizontalVariant(variant: string): boolean {
    if (variant === "start-left" || variant === "end-left" || variant === "start-right" || variant === "end-right") {
      return true;
    }

    return variant.startsWith("horizontal");
  }

  private static isVerticalVariant(variant: string): boolean {
    if (variant === "start-top" || variant === "end-top" || variant === "start-bottom" || variant === "end-bottom") {
      return true;
    }

    return variant.startsWith("vertical");
  }
}