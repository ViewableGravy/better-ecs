import {
    CARDINAL_GRID_OFFSETS,
    type CardinalSide,
} from "@client/systems/world/build-mode/grid-neighbor-query";
import type { BuildModePlacementEndSide } from "@libs/commands/build-mode";

export { CONVEYOR_SLOT_POSITIONS } from "@client/entities/transport-belt/core/slots";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type TransportBeltPlacementSide = BuildModePlacementEndSide & CardinalSide;
export type TransportBeltSide = TransportBeltPlacementSide;

export type TransportBeltDirection = "north" | "east" | "south" | "west";

export type TransportBeltFlow = readonly [tailDirection: TransportBeltDirection, headDirection: TransportBeltDirection];

export const TRANSPORT_BELT_VARIANTS = [
  "horizontal-right",
  "horizontal-left",
  "vertical-up",
  "vertical-down",
  "angled-right-up",
  "angled-up-right",
  "angled-left-up",
  "angled-top-left",
  "angled-bottom-right",
  "angled-right-bottom",
  "angled-bottom-left",
  "angled-left-bottom",
  "start-bottom",
  "end-bottom",
  "start-left",
  "end-left",
  "start-top",
  "end-top",
  "start-right",
  "end-right",
] as const;

export type TransportBeltVariant = (typeof TRANSPORT_BELT_VARIANTS)[number];

/**********************************************************************************************************
 *   CONSTANTS
 **********************************************************************************************************/

export const TRANSPORT_BELT_HALF_SIZE = 10;

export const TRANSPORT_BELT_DIRECTIONS: readonly TransportBeltDirection[] = ["north", "east", "south", "west"];

export const TRANSPORT_BELT_GRID_SIDE_BY_DIRECTION: Readonly<Record<TransportBeltDirection, CardinalSide>> = {
  north: "top",
  east: "right",
  south: "bottom",
  west: "left",
};

export const TRANSPORT_BELT_DIRECTION_BY_GRID_SIDE: Readonly<Record<CardinalSide, TransportBeltDirection>> = {
  left: "west",
  right: "east",
  top: "north",
  bottom: "south",
};

export const TRANSPORT_BELT_DIRECTION_GRID_OFFSETS: Readonly<Record<TransportBeltDirection, readonly [x: number, y: number]>> = {
  north: CARDINAL_GRID_OFFSETS.top,
  east: CARDINAL_GRID_OFFSETS.right,
  south: CARDINAL_GRID_OFFSETS.bottom,
  west: CARDINAL_GRID_OFFSETS.left,
};

export const TRANSPORT_BELT_FLOW_BY_VARIANT: Readonly<Record<string, TransportBeltFlow>> = {
  "horizontal-right": ["west", "east"],
  "horizontal-left": ["east", "west"],
  "vertical-up": ["south", "north"],
  "vertical-down": ["north", "south"],
  "angled-right-up": ["east", "north"],
  "angled-up-right": ["north", "east"],
  "angled-left-up": ["west", "north"],
  "angled-top-left": ["north", "west"],
  "angled-bottom-right": ["south", "east"],
  "angled-right-bottom": ["east", "south"],
  "angled-bottom-left": ["south", "west"],
  "angled-left-bottom": ["west", "south"],
  "start-bottom": ["south", "north"],
  "end-bottom": ["north", "south"],
  "start-left": ["west", "east"],
  "end-left": ["east", "west"],
  "start-top": ["north", "south"],
  "end-top": ["south", "north"],
  "start-right": ["east", "west"],
  "end-right": ["west", "east"],
};

const TRANSPORT_BELT_VARIANT_BY_FLOW_KEY: Readonly<Record<string, TransportBeltVariant>> = Object.fromEntries(
  Object.entries(TRANSPORT_BELT_FLOW_BY_VARIANT).map(([variant, [start, end]]) => [`${start}:${end}`, variant as TransportBeltVariant]),
);

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getTransportBeltFlow(variant: string): TransportBeltFlow | undefined {
  return TRANSPORT_BELT_FLOW_BY_VARIANT[variant];
}

export function getTransportBeltVariantByFlow(
  tailDirection: TransportBeltDirection,
  headDirection: TransportBeltDirection,
): TransportBeltVariant | undefined {
  return TRANSPORT_BELT_VARIANT_BY_FLOW_KEY[`${tailDirection}:${headDirection}`];
}

export function getTransportBeltDirectionFromGridSide(side: CardinalSide): TransportBeltDirection {
  return TRANSPORT_BELT_DIRECTION_BY_GRID_SIDE[side];
}

export function getTransportBeltGridSide(direction: TransportBeltDirection): CardinalSide {
  return TRANSPORT_BELT_GRID_SIDE_BY_DIRECTION[direction];
}

export function getTransportBeltDirectionFromPlacementSide(side: TransportBeltPlacementSide): TransportBeltDirection {
  return getTransportBeltDirectionFromGridSide(side);
}
