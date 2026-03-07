import {
  canConveyorStoreEntities,
  ConveyorBeltComponent,
  type ConveyorSide,
  type ConveyorSlotIndex,
} from "@client/components/conveyor-belt";
import { CONVEYOR_SLOT_POSITIONS } from "@client/entities/transport-belt/slot-lookup";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import invariant from "tiny-invariant";

const SHARED_ADD_ENTITY_POSITION = new Vec2();

export class ConveyorUtils {
  public static addEntity(
    world: UserWorld,
    conveyorEntityId: EntityId,
    entity: EntityId,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
    progress: number = 0.5,
  ): void {
    const conveyor = world.require(conveyorEntityId, ConveyorBeltComponent);
    const slots = side === "left" 
      ? conveyor.left 
      : conveyor.right;
    const slotProgress = side === "left" 
      ? conveyor.leftProgress 
      : conveyor.rightProgress;

    invariant(
      canConveyorStoreEntities(conveyor.variant),
      `Conveyor ${conveyor.variant} is visual-only and cannot store entities`,
    );
    invariant(
      slots[index] === null,
      `Conveyor ${conveyor.variant} already has an entity at ${side}[${index}]`,
    );

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto(
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
   * Temporary until we support entities on all types of belts and do not require conditions
   */
  public static supportsStraightItemAnimation(variant: string): boolean {
    if (!canConveyorStoreEntities(variant)) {
      return false;
    }

    return variant.startsWith("horizontal-") || variant.startsWith("vertical-");
  }

  public static resolveAnimatedSlotLocalPositionInto(
    variant: string,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
    progress: number,
    out: Vec2,
  ): void {
    const [centerX, centerY] = ConveyorUtils.resolveSlotLocalPosition(variant, side, index);
    const [stepX, stepY] = ConveyorUtils.resolveSlotStepVector(variant, side, index);
    const progressOffset = progress - 0.5;

    out.set(
      centerX + stepX * progressOffset,
      centerY + stepY * progressOffset,
    );
  }

  public static resolveSlotLocalPosition(
    variant: string,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
  ): readonly [number, number] {
    const mappedPosition = CONVEYOR_SLOT_POSITIONS[`${variant}:${side}:${index}`];

    invariant(mappedPosition, `No slot position found for variant ${variant}, side ${side}, index ${index}`);

    return mappedPosition;
  }

  private static resolveSlotStepVector(
    variant: string,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
  ): readonly [number, number] {
    const [currentX, currentY] = ConveyorUtils.resolveSlotLocalPosition(variant, side, index);

    if (index === 0 || index === 1 || index === 2) {
      const nextIndex: ConveyorSlotIndex = index === 0 ? 1 : index === 1 ? 2 : 3;
      const [nextX, nextY] = ConveyorUtils.resolveSlotLocalPosition(variant, side, nextIndex);

      return [nextX - currentX, nextY - currentY];
    }

    const previousIndex: ConveyorSlotIndex = 2;
    const [previousX, previousY] = ConveyorUtils.resolveSlotLocalPosition(variant, side, previousIndex);

    return [currentX - previousX, currentY - previousY];
  }
}