import { Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
import { type Side } from "../types";

export class ConveyorGeometryUtils {
  public static containsPoint(
    pointX: number,
    pointY: number,
    beltCollider: RectangleCollider,
    beltTransform: Transform2D,
  ): boolean {
    const beltLeft = beltTransform.curr.pos.x + beltCollider.bounds.left;
    const beltTop = beltTransform.curr.pos.y + beltCollider.bounds.top;
    const beltRight = beltLeft + beltCollider.bounds.size.x;
    const beltBottom = beltTop + beltCollider.bounds.size.y;

    return pointX >= beltLeft && pointX <= beltRight && pointY >= beltTop && pointY <= beltBottom;
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
