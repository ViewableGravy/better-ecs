import type { TransportBeltFlow, TransportBeltSide } from "@client/entities/transport-belt/consts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type SideVector = readonly [x: number, y: number];

/**********************************************************************************************************
 *   CONSTANTS
 **********************************************************************************************************/

export const TRANSPORT_BELT_OPPOSITE_SIDE: Readonly<Record<TransportBeltSide, TransportBeltSide>> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

export const TRANSPORT_BELT_SIDE_VECTORS: Readonly<Record<TransportBeltSide, SideVector>> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getOppositeTransportBeltSide(side: TransportBeltSide): TransportBeltSide {
  return TRANSPORT_BELT_OPPOSITE_SIDE[side];
}

export function getTransportBeltSideVector(side: TransportBeltSide): SideVector {
  return TRANSPORT_BELT_SIDE_VECTORS[side];
}

export function getTransportBeltInwardNormal(side: TransportBeltSide): SideVector {
  return getTransportBeltSideVector(getOppositeTransportBeltSide(side));
}

export function getTransportBeltOutwardNormal(side: TransportBeltSide): SideVector {
  return getTransportBeltSideVector(side);
}

export function isHorizontalTransportBeltFlow(flow: TransportBeltFlow): boolean {
  const [start, end] = flow;

  return (start === "left" || start === "right")
    && (end === "left" || end === "right");
}

export function isVerticalTransportBeltFlow(flow: TransportBeltFlow): boolean {
  const [start, end] = flow;

  return (start === "top" || start === "bottom")
    && (end === "top" || end === "bottom");
}

export function isStraightTransportBeltFlow(flow: TransportBeltFlow): boolean {
  return isHorizontalTransportBeltFlow(flow) || isVerticalTransportBeltFlow(flow);
}

export function getTransportBeltFlowVector(flow: TransportBeltFlow): SideVector {
  const [start, end] = flow;
  const [startX, startY] = getTransportBeltSideVector(start);
  const [endX, endY] = getTransportBeltSideVector(end);

  return [endX - startX, endY - startY];
}
