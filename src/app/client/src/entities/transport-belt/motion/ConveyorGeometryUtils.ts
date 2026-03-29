import type { TransportBeltDirection } from "@client/entities/transport-belt/consts";
import { Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";

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

  public static sideMidpointX(side: TransportBeltDirection, halfSize: number): number {
    switch (side) {
      case "north":
        return 0;
      case "east":
        return halfSize;
      case "south":
        return 0;
      case "west":
        return -halfSize;
    }
  }

  public static sideMidpointY(side: TransportBeltDirection, halfSize: number): number {
    switch (side) {
      case "north":
        return -halfSize;
      case "east":
        return 0;
      case "south":
        return halfSize;
      case "west":
        return 0;
    }
  }
}
