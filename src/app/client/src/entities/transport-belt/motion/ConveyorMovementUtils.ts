import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import {
    getTransportBeltInwardNormal,
    getTransportBeltOutwardNormal,
    getTransportBeltVariantDescriptor,
} from "@client/entities/transport-belt/core";
import { ConveyorGeometryUtils } from "@client/entities/transport-belt/motion/ConveyorGeometryUtils";
import { dotNormalized, setNormalized, Vec2 } from "@engine";
import { Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";

const SHARED_OUTWARD = new Vec2();

export class ConveyorMovementUtils {
  public static resolveBeltMotionVector(
    variant: string,
    playerX: number,
    playerY: number,
    beltTransform: Transform2D,
    beltCollider: RectangleCollider,
    out: Vec2,
  ): void {
    const descriptor = getTransportBeltVariantDescriptor(variant);

    if (!descriptor) {
      out.set(0, 0);
      return;
    }

    if (descriptor.direction) {
      out.set(descriptor.direction[0], descriptor.direction[1]);
      return;
    }

    this.resolveCurveMotion(
      descriptor.flow[0],
      descriptor.flow[1],
      playerX,
      playerY,
      beltTransform,
      beltCollider,
      out,
    );
  }

  private static resolveCurveMotion(
    from: TransportBeltSide,
    to: TransportBeltSide,
    playerX: number,
    playerY: number,
    beltTransform: Transform2D,
    beltCollider: RectangleCollider,
    out: Vec2,
  ): void {
    const inward = getTransportBeltInwardNormal(from);
    const outward = getTransportBeltOutwardNormal(to);

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
      dotNormalized(clockwiseX, clockwiseY, inward[0], inward[1])
      + dotNormalized(clockwiseX, clockwiseY, outward[0], outward[1]);
    const counterClockwiseScore =
      dotNormalized(counterClockwiseX, counterClockwiseY, inward[0], inward[1])
      + dotNormalized(counterClockwiseX, counterClockwiseY, outward[0], outward[1]);

    SHARED_OUTWARD.set(outward[0], outward[1]);

    if (clockwiseScore >= counterClockwiseScore) {
      setNormalized(out, clockwiseX, clockwiseY, SHARED_OUTWARD);
      return;
    }

    setNormalized(out, counterClockwiseX, counterClockwiseY, SHARED_OUTWARD);
  }
}
