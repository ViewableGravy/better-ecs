import { Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
import { BELT_OVERLAP_PADDING } from "../constants";
import { type FeetGeometry, type Side } from "../types";

export class ConveyorGeometryUtils {
  public static computeFeetOverlapRatio(
    feet: FeetGeometry,
    beltCollider: unknown,
    beltTransform: Transform2D,
  ): number {
    if (!(beltCollider instanceof RectangleCollider)) {
      return 0;
    }

    const beltLeft = beltTransform.curr.pos.x + beltCollider.bounds.left - BELT_OVERLAP_PADDING;
    const beltTop = beltTransform.curr.pos.y + beltCollider.bounds.top - BELT_OVERLAP_PADDING;
    const beltRight = beltLeft + beltCollider.bounds.size.x + BELT_OVERLAP_PADDING * 2;
    const beltBottom = beltTop + beltCollider.bounds.size.y + BELT_OVERLAP_PADDING * 2;

    const overlapLeft = Math.max(feet.left, beltLeft);
    const overlapTop = Math.max(feet.top, beltTop);
    const overlapRight = Math.min(feet.right, beltRight);
    const overlapBottom = Math.min(feet.bottom, beltBottom);

    const overlapWidth = overlapRight - overlapLeft;
    const overlapHeight = overlapBottom - overlapTop;

    if (overlapWidth <= 0 || overlapHeight <= 0) {
      return 0;
    }

    return (overlapWidth * overlapHeight) / feet.area;
  }

  public static sideMidpointX(side: Side, halfSize: number): number {
    switch (side) {
      case "left":
        return -halfSize;
      case "right":
        return halfSize;
      case "top":
        return 0;
      case "bottom":
        return 0;
    }
  }

  public static sideMidpointY(side: Side, halfSize: number): number {
    switch (side) {
      case "left":
        return 0;
      case "right":
        return 0;
      case "top":
        return -halfSize;
      case "bottom":
        return halfSize;
    }
  }
}
