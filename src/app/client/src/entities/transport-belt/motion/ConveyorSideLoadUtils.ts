import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/ConveyorUtils";
import type { TransportBeltDirection, TransportBeltFlow } from "@client/entities/transport-belt/consts";
import {
    getOppositeTransportBeltDirection,
    getTransportBeltDirectionVector,
    getTransportBeltFlowVector,
    getTransportBeltVariantDescriptor,
    isStraightTransportBeltFlow,
    TransportBeltGridQuery,
} from "@client/entities/transport-belt/core";
import type { EntityId, UserWorld } from "@engine";
import type { ConveyorSideLoadTransfer } from "./types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class ConveyorSideLoadUtils {
  public static resolveDeferredTransfer(world: UserWorld, sourceEntityId: EntityId<ConveyorBeltComponent>): ConveyorSideLoadTransfer | null {
    const sourceConveyor = world.get(sourceEntityId, ConveyorBeltComponent);

    if (sourceConveyor.nextEntityId !== null) {
      return null;
    }

    if (!ConveyorUtils.supportsItemAnimation(sourceConveyor.variant)) {
      return null;
    }

    const sourceDescriptor = getTransportBeltVariantDescriptor(sourceConveyor.variant);

    if (!sourceDescriptor) {
      return null;
    }

    const [, sourceEndDirection] = sourceDescriptor.flow;
    const sourceCoordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, sourceEntityId);
    const targetCoordinates = TransportBeltGridQuery.resolveNeighborCoordinatesInDirection(sourceCoordinates, sourceEndDirection);
    const targetEntityId = this.findStraightTargetEntityId(world, sourceEntityId, targetCoordinates);

    if (targetEntityId === null) {
      return null;
    }

    const targetConveyor = world.get(targetEntityId, ConveyorBeltComponent);

    if (!targetConveyor) {
      return null;
    }

    const targetDescriptor = getTransportBeltVariantDescriptor(targetConveyor.variant);
    const approachedDirection = getOppositeTransportBeltDirection(sourceEndDirection);

    if (!targetDescriptor || !this.isSideApproach(targetDescriptor.flow, approachedDirection)) {
      return null;
    }

    return {
      sourceEntityId,
      targetEntityId,
      targetLane: this.resolveTargetLane(targetDescriptor.flow, approachedDirection),
    };
  }

  private static findStraightTargetEntityId(
    world: UserWorld,
    sourceEntityId: EntityId,
    targetCoordinates: ReturnType<typeof TransportBeltGridQuery.resolveBeltCoordinates>,
  ): EntityId | null {
    return TransportBeltGridQuery.findBeltEntityAtCoordinates(world, targetCoordinates, {
      excludeEntityId: sourceEntityId,
      predicate: (_, candidateConveyor) => this.isStraightAnimatedConveyor(candidateConveyor.variant),
    });
  }

  private static isStraightAnimatedConveyor(variant: string): boolean {
    const descriptor = getTransportBeltVariantDescriptor(variant);

    if (!descriptor || !ConveyorUtils.supportsItemAnimation(variant)) {
      return false;
    }

    return isStraightTransportBeltFlow(descriptor.flow);
  }

  private static isSideApproach(flow: TransportBeltFlow, approachedDirection: TransportBeltDirection): boolean {
    const [start, end] = flow;

    return approachedDirection !== start && approachedDirection !== end;
  }

  private static resolveTargetLane(flow: TransportBeltFlow, approachedDirection: TransportBeltDirection) {
    const targetVector = getTransportBeltFlowVector(flow);
    const approachVector = getTransportBeltDirectionVector(approachedDirection);
    const cross = targetVector[0] * approachVector[1] - targetVector[1] * approachVector[0];

    if (cross < 0) {
      return "left";
    }

    return "right";
  }
}
