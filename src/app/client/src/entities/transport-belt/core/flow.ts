import type { TransportBeltDirection, TransportBeltFlow } from "@client/entities/transport-belt/consts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type SideVector = readonly [x: number, y: number];

/**********************************************************************************************************
 *   CONSTANTS
 **********************************************************************************************************/

export const TRANSPORT_BELT_OPPOSITE_DIRECTION: Readonly<Record<TransportBeltDirection, TransportBeltDirection>> = {
  north: "south",
  east: "west",
  south: "north",
  west: "east",
};

export const TRANSPORT_BELT_DIRECTION_VECTORS: Readonly<Record<TransportBeltDirection, SideVector>> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getOppositeTransportBeltDirection(direction: TransportBeltDirection): TransportBeltDirection {
  return TRANSPORT_BELT_OPPOSITE_DIRECTION[direction];
}

export function getTransportBeltDirectionVector(direction: TransportBeltDirection): SideVector {
  return TRANSPORT_BELT_DIRECTION_VECTORS[direction];
}

export function getTransportBeltInwardNormal(direction: TransportBeltDirection): SideVector {
  return getTransportBeltDirectionVector(getOppositeTransportBeltDirection(direction));
}

export function getTransportBeltOutwardNormal(direction: TransportBeltDirection): SideVector {
  return getTransportBeltDirectionVector(direction);
}

export function isHorizontalTransportBeltFlow(flow: TransportBeltFlow): boolean {
  const [start, end] = flow;

  return (start === "west" || start === "east")
    && (end === "west" || end === "east");
}

export function isVerticalTransportBeltFlow(flow: TransportBeltFlow): boolean {
  const [start, end] = flow;

  return (start === "north" || start === "south")
    && (end === "north" || end === "south");
}

export function isStraightTransportBeltFlow(flow: TransportBeltFlow): boolean {
  return isHorizontalTransportBeltFlow(flow) || isVerticalTransportBeltFlow(flow);
}

export function getTransportBeltFlowVector(flow: TransportBeltFlow): SideVector {
  const [start, end] = flow;
  const [startX, startY] = getTransportBeltDirectionVector(start);
  const [endX, endY] = getTransportBeltDirectionVector(end);

  return [endX - startX, endY - startY];
}
