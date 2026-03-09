import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/ConveyorUtils";
import type { TransportBeltFlow, TransportBeltSide } from "@client/entities/transport-belt/consts";
import {
    getOppositeTransportBeltSide,
    getTransportBeltFlowVector,
    getTransportBeltSideVector,
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

    const [, sourceEndSide] = sourceDescriptor.flow;
    const sourceCoordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, sourceEntityId);
    const targetCoordinates = TransportBeltGridQuery.resolveNeighborCoordinates(sourceCoordinates, sourceEndSide);
    const targetEntityId = this.findStraightTargetEntityId(world, sourceEntityId, targetCoordinates);

    if (targetEntityId === null) {
      return null;
    }

    const targetConveyor = world.get(targetEntityId, ConveyorBeltComponent);

    if (!targetConveyor) {
      return null;
    }

    const targetDescriptor = getTransportBeltVariantDescriptor(targetConveyor.variant);
    const approachedSide = getOppositeTransportBeltSide(sourceEndSide);

    if (!targetDescriptor || !this.isSideApproach(targetDescriptor.flow, approachedSide)) {
      return null;
    }

    return {
      sourceEntityId,
      targetEntityId,
      targetLane: this.resolveTargetLane(targetDescriptor.flow, approachedSide),
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

  private static isSideApproach(
    flow: TransportBeltFlow,
    approachedSide: TransportBeltSide,
  ): boolean {
    const [start, end] = flow;

    return approachedSide !== start && approachedSide !== end;
  }

  private static resolveTargetLane(
    flow: TransportBeltFlow,
    approachedSide: TransportBeltSide,
  ) {
    const targetVector = getTransportBeltFlowVector(flow);
    const approachVector = getTransportBeltSideVector(approachedSide);
    const cross = targetVector[0] * approachVector[1] - targetVector[1] * approachVector[0];

    if (cross < 0) {
      return "left";
    }

    return "right";
  }
}
