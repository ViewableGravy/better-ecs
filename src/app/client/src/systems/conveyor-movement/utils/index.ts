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
  private static readonly SIDE_ALIASES: Record<string, Side> = {
    left: "left",
    right: "right",
    top: "top",
    bottom: "bottom",
    up: "top",
    down: "bottom",
  };

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
    if (variant.startsWith("horizontal_") || variant.startsWith("vertical_")) {
      const flowSides = variant.slice(variant.indexOf("_") + 1).split("-");
      if (flowSides.length === 2) {
        const toSide = flowSides[1];
        if (this.isSide(toSide)) {
          return {
            type: "straight",
            direction: SIDE_TO_OUTWARD[toSide],
          };
        }
      }
    }

    const normalizedVariant = variant.startsWith("curved_")
      ? `angled-${variant.slice("curved_".length)}`
      : variant;

    switch (variant) {
      case "horizontal-right":
      case "start-left":
      case "end-right":
        return { type: "straight", direction: DIRECTION_RIGHT };
      case "horizontal-left":
      case "end-left":
      case "start-right":
        return { type: "straight", direction: DIRECTION_LEFT };
      case "vertical-up":
      case "start-bottom":
      case "end-top":
        return { type: "straight", direction: DIRECTION_UP };
      case "vertical-down":
      case "start-top":
      case "end-bottom":
        return { type: "straight", direction: DIRECTION_DOWN };
      default:
        break;
    }

    if (!normalizedVariant.startsWith("angled-")) {
      return undefined;
    }

    const sideLabel = normalizedVariant.slice("angled-".length);
    const sideParts = sideLabel.split("-");

    if (sideParts.length !== 2) {
      return undefined;
    }

    const from = this.normalizeSideToken(sideParts[0]);
    const to = this.normalizeSideToken(sideParts[1]);

    if (!from || !to) {
      return undefined;
    }

    return {
      type: "curve",
      from,
      to,
    };
  }

  private static isSide(value: string): value is Side {
    return value === "left" || value === "right" || value === "top" || value === "bottom";
  }

  private static normalizeSideToken(value: string): Side | undefined {
    return this.SIDE_ALIASES[value];
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
