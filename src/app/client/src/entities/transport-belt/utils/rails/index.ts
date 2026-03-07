import type {
    ConveyorSide,
    ConveyorSlotIndex,
} from "@client/components/conveyor-belt";
import {
    CONVEYOR_SLOT_POSITIONS,
    TRANSPORT_BELT_HALF_SIZE,
    getTransportBeltFlow,
    type TransportBeltFlow,
    type TransportBeltSide,
} from "@client/entities/transport-belt/consts";
import { Vec2 } from "@engine";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type RailPoint = readonly [x: number, y: number];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class BeltItemRailsUtility {
  public static resolvePositionInto(
    variant: string,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
    progress: number,
    out: Vec2,
  ): void {
    // Each belt currently exposes 4 slots per lane, so `(index + progress) / 4`
    // converts the current slot-plus-interpolation state into a normalized
    // 0..1 rail percentage across the full belt path.
    const railProgress = (index + progress) / 4;

    this.resolvePositionOnRailInto(variant, side, railProgress, out);
  }

  public static resolvePositionOnRailInto(
    variant: string,
    side: ConveyorSide,
    railProgress: number,
    out: Vec2,
  ): void {
    const flow = getTransportBeltFlow(variant);

    invariant(flow, `No transport belt flow found for variant ${variant}`);

    const clampedRailProgress = Math.min(1, Math.max(0, railProgress));

    if (this.isStraightFlow(flow)) {
      this.resolveStraightRailPositionInto(variant, side, flow, clampedRailProgress, out);
      return;
    }

    this.resolveCurveRailPositionInto(variant, side, flow, clampedRailProgress, out);
  }

  private static resolveStraightRailPositionInto(
    variant: string,
    side: ConveyorSide,
    flow: TransportBeltFlow,
    railProgress: number,
    out: Vec2,
  ): void {
    const [start, end] = flow;
    const [slotX, slotY] = this.resolveSlotLocalPosition(variant, side, 0);

    if (start === "left" || start === "right") {
      const startX = this.resolveStraightEdgeCoordinate(start);
      const endX = this.resolveStraightEdgeCoordinate(end);

      out.set(startX + (endX - startX) * railProgress, slotY);
      return;
    }

    const startY = this.resolveStraightEdgeCoordinate(start);
    const endY = this.resolveStraightEdgeCoordinate(end);

    out.set(slotX, startY + (endY - startY) * railProgress);
  }

  private static resolveCurveRailPositionInto(
    variant: string,
    side: ConveyorSide,
    flow: TransportBeltFlow,
    railProgress: number,
    out: Vec2,
  ): void {
    const [start, end] = flow;
    const [centerX, centerY] = this.resolveCurveCenter(flow);
    const [slotX, slotY] = this.resolveSlotLocalPosition(variant, side, 0);

    const radius = Math.hypot(slotX - centerX, slotY - centerY);

    const [startX, startY] = this.resolveCurveEndpoint(start, centerX, centerY, radius);
    const [endX, endY] = this.resolveCurveEndpoint(end, centerX, centerY, radius);

    const startAngle = Math.atan2(startY - centerY, startX - centerX);
    const endAngle = Math.atan2(endY - centerY, endX - centerX);

    const angleDelta = this.resolveQuarterTurnAngleDelta(startAngle, endAngle);
    const angle = startAngle + angleDelta * railProgress;

    out.set(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    );
  }

  private static resolveCurveCenter(flow: TransportBeltFlow): RailPoint {
    const [start, end] = flow;
    const centerX = start === "left" || start === "right"
      ? this.resolveStraightEdgeCoordinate(start)
      : this.resolveStraightEdgeCoordinate(end);
    const centerY = start === "top" || start === "bottom"
      ? this.resolveStraightEdgeCoordinate(start)
      : this.resolveStraightEdgeCoordinate(end);

    return [centerX, centerY];
  }

  private static resolveCurveEndpoint(
    side: TransportBeltSide,
    centerX: number,
    centerY: number,
    radius: number,
  ): RailPoint {
    if (side === "left") {
      return [-TRANSPORT_BELT_HALF_SIZE, centerY > 0 ? centerY - radius : centerY + radius];
    }

    if (side === "right") {
      return [TRANSPORT_BELT_HALF_SIZE, centerY > 0 ? centerY - radius : centerY + radius];
    }

    if (side === "top") {
      return [centerX > 0 ? centerX - radius : centerX + radius, -TRANSPORT_BELT_HALF_SIZE];
    }

    return [centerX > 0 ? centerX - radius : centerX + radius, TRANSPORT_BELT_HALF_SIZE];
  }

  private static resolveQuarterTurnAngleDelta(startAngle: number, endAngle: number): number {
    const clockwiseCandidate = startAngle + Math.PI * 0.5;
    const counterClockwiseCandidate = startAngle - Math.PI * 0.5;
    const clockwiseDistance = this.resolveAngleDistance(clockwiseCandidate, endAngle);
    const counterClockwiseDistance = this.resolveAngleDistance(counterClockwiseCandidate, endAngle);

    if (clockwiseDistance <= counterClockwiseDistance) {
      return Math.PI * 0.5;
    }

    return -Math.PI * 0.5;
  }

  private static resolveAngleDistance(from: number, to: number): number {
    const signedDistance = Math.atan2(Math.sin(to - from), Math.cos(to - from));

    return Math.abs(signedDistance);
  }

  private static resolveStraightEdgeCoordinate(side: TransportBeltSide): number {
    if (side === "left" || side === "top") {
      return -TRANSPORT_BELT_HALF_SIZE;
    }

    return TRANSPORT_BELT_HALF_SIZE;
  }

  private static isStraightFlow(flow: TransportBeltFlow): boolean {
    const [start, end] = flow;
    const isHorizontal = (start === "left" || start === "right")
      && (end === "left" || end === "right");

    if (isHorizontal) {
      return true;
    }

    return (start === "top" || start === "bottom")
      && (end === "top" || end === "bottom");
  }

  private static resolveSlotLocalPosition(
    variant: string,
    side: ConveyorSide,
    index: ConveyorSlotIndex,
  ): RailPoint {
    const mappedPosition = CONVEYOR_SLOT_POSITIONS[`${variant}:${side}:${index}`];

    invariant(mappedPosition, `No slot position found for variant ${variant}, side ${side}, index ${index}`);

    return mappedPosition;
  }
}