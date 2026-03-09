import { ConveyorBeltComponent, type ConveyorSide } from "@client/components/conveyor-belt";
import {
  getTransportBeltFlow,
  TRANSPORT_BELT_SIDE_GRID_OFFSETS,
  type TransportBeltFlow,
  type TransportBeltSide,
} from "@client/entities/transport-belt/consts";
import { ConveyorUtils } from "@client/entities/transport-belt/utils/general";
import { GridSingleton, type GridCoordinate, type GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import type { ConveyorSideLoadTransfer } from "./types";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type FlowVector = readonly [x: number, y: number];

const OPPOSITE_SIDE: Readonly<Record<TransportBeltSide, TransportBeltSide>> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

const FLOW_VECTORS: Readonly<Record<TransportBeltSide, FlowVector>> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

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

    const sourceTransform = world.get(sourceEntityId, Transform2D);
    const sourceFlow = getTransportBeltFlow(sourceConveyor.variant);

    if (!sourceTransform || !sourceFlow) {
      return null;
    }

    const [, sourceEndSide] = sourceFlow;
    const sourceCoordinates = GridSingleton.worldToGridCoordinates(
      sourceTransform.curr.pos.x,
      sourceTransform.curr.pos.y,
    );
    const targetCoordinates = this.offsetGridCoordinates(
      sourceCoordinates,
      TRANSPORT_BELT_SIDE_GRID_OFFSETS[sourceEndSide],
    );
    const targetEntityId = this.findStraightTargetEntityId(world, sourceEntityId, targetCoordinates);

    if (targetEntityId === null) {
      return null;
    }

    const targetConveyor = world.get(targetEntityId, ConveyorBeltComponent);

    if (!targetConveyor) {
      return null;
    }

    const targetFlow = getTransportBeltFlow(targetConveyor.variant);
    const approachedSide = OPPOSITE_SIDE[sourceEndSide];

    if (!targetFlow || !this.isSideApproach(targetFlow, approachedSide)) {
      return null;
    }

    return {
      sourceEntityId,
      targetEntityId,
      targetLane: this.resolveTargetLane(targetFlow, approachedSide),
    };
  }

  private static findStraightTargetEntityId(
    world: UserWorld,
    sourceEntityId: EntityId,
    targetCoordinates: GridCoordinates,
  ): EntityId | null {
    let match: EntityId | null = null;

    world.forEach2(ConveyorBeltComponent, Transform2D, (candidateEntityId, candidateConveyor, candidateTransform) => {
      if (match !== null || candidateEntityId === sourceEntityId) {
        return;
      }

      if (!this.isStraightAnimatedConveyor(candidateConveyor.variant)) {
        return;
      }

      const candidateCoordinates = GridSingleton.worldToGridCoordinates(
        candidateTransform.curr.pos.x,
        candidateTransform.curr.pos.y,
      );

      if (!GridSingleton.areCoordinatesEqual(candidateCoordinates, targetCoordinates)) {
        return;
      }

      match = candidateEntityId;
    });

    return match;
  }

  private static isStraightAnimatedConveyor(variant: string): boolean {
    const flow = getTransportBeltFlow(variant);

    if (!flow || !ConveyorUtils.supportsItemAnimation(variant)) {
      return false;
    }

    const [start, end] = flow;
    const isHorizontal = (start === "left" || start === "right")
      && (end === "left" || end === "right");

    if (isHorizontal) {
      return true;
    }

    return (start === "top" || start === "bottom")
      && (end === "top" || end === "bottom");
  }

  private static isSideApproach(flow: TransportBeltFlow, approachedSide: TransportBeltSide): boolean {
    const [start, end] = flow;

    return approachedSide !== start && approachedSide !== end;
  }

  private static resolveTargetLane(flow: TransportBeltFlow, approachedSide: TransportBeltSide): ConveyorSide {
    const targetVector = this.resolveFlowVector(flow);
    const approachVector = FLOW_VECTORS[approachedSide];
    const cross = targetVector[0] * approachVector[1] - targetVector[1] * approachVector[0];

    if (cross < 0) {
      return "left";
    }

    return "right";
  }

  private static resolveFlowVector(flow: TransportBeltFlow): FlowVector {
    const [start, end] = flow;
    const startVector = FLOW_VECTORS[start];
    const endVector = FLOW_VECTORS[end];

    return [
      endVector[0] - startVector[0],
      endVector[1] - startVector[1],
    ];
  }

  private static offsetGridCoordinates(
    coordinates: GridCoordinates,
    offset: readonly [x: number, y: number],
  ): GridCoordinates {
    return [
      (Number(coordinates[0]) + offset[0]) as GridCoordinate,
      (Number(coordinates[1]) + offset[1]) as GridCoordinate,
    ];
  }
}