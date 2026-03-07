import { getTransportBeltFlow } from "@client/entities/transport-belt/consts";
import { dotNormalized, setNormalized, Vec2 } from "@engine";
import { Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
import {
  DIRECTION_DOWN,
  DIRECTION_LEFT,
  DIRECTION_RIGHT,
  DIRECTION_UP,
  SIDE_TO_INWARD,
  SIDE_TO_OUTWARD
} from "../constants";
import { type BeltFlow, type Side } from "../types";
import { ConveyorGeometryUtils } from "./geometry-utils";

export class ConveyorMovementUtils {
  public static resolveBeltMotionVector(
    variant: string,
    playerX: number,
    playerY: number,
    beltTransform: Transform2D,
    beltCollider: RectangleCollider,
    out: Vec2,
  ): void {
    const flow = this.resolveBeltFlow(variant);

    if (!flow)
      return void out.set(0, 0);

    if (flow.type === "straight")
      return void out.set(flow.direction);

    this.resolveCurveMotion(flow.from, flow.to, playerX, playerY, beltTransform, beltCollider, out);
  }

  private static resolveBeltFlow(variant: string): BeltFlow | undefined {
    const flow = getTransportBeltFlow(variant);

    if (!flow) {
      return undefined;
    }

    const [start, end] = flow;

    if (start === "left" && end === "right") {
      return { type: "straight", direction: DIRECTION_RIGHT };
    }

    if (start === "right" && end === "left") {
      return { type: "straight", direction: DIRECTION_LEFT };
    }

    if (start === "bottom" && end === "top") {
      return { type: "straight", direction: DIRECTION_UP };
    }

    if (start === "top" && end === "bottom") {
      return { type: "straight", direction: DIRECTION_DOWN };
    }

    return {
      type: "curve",
      from: start,
      to: end,
    };
  }

  private static resolveCurveMotion(
    from: Side,
    to: Side,
    playerX: number,
    playerY: number,
    beltTransform: Transform2D,
    beltCollider: RectangleCollider,
    out: Vec2,
  ): void {
    const inward = SIDE_TO_INWARD[from];
    const outward = SIDE_TO_OUTWARD[to];

    const halfSize = Math.min(beltCollider.bounds.size.x, beltCollider.bounds.size.y) * 0.5;
    const entryX = ConveyorGeometryUtils.sideMidpointX(from, halfSize);
    const entryY = ConveyorGeometryUtils.sideMidpointY(from, halfSize);
    const exitX = ConveyorGeometryUtils.sideMidpointX(to, halfSize);
    const exitY = ConveyorGeometryUtils.sideMidpointY(to, halfSize);
    const centerX = entryX !== 0 ? entryX : exitX;
    const centerY = entryY !== 0 ? entryY : exitY;

    const localX = playerX - beltTransform.curr.pos.x;
    const localY = playerY - beltTransform.curr.pos.y;
    const radiusX = localX - centerX;
    const radiusY = localY - centerY;

    const clockwiseX = radiusY;
    const clockwiseY = -radiusX;
    const counterClockwiseX = -radiusY;
    const counterClockwiseY = radiusX;

    const clockwiseScore =
      dotNormalized(clockwiseX, clockwiseY, inward.x, inward.y)
      + dotNormalized(clockwiseX, clockwiseY, outward.x, outward.y);
    const counterClockwiseScore =
      dotNormalized(counterClockwiseX, counterClockwiseY, inward.x, inward.y)
      + dotNormalized(counterClockwiseX, counterClockwiseY, outward.x, outward.y);

    if (clockwiseScore >= counterClockwiseScore) {
      setNormalized(out, clockwiseX, clockwiseY, outward);
      return;
    }

    setNormalized(out, counterClockwiseX, counterClockwiseY, outward);
  }
}
