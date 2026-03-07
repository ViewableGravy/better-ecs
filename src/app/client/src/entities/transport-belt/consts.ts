export { CONVEYOR_SLOT_POSITIONS } from "@client/entities/transport-belt/slot-lookup";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type TransportBeltSide = "left" | "right" | "top" | "bottom";

export type TransportBeltFlow = readonly [start: TransportBeltSide, end: TransportBeltSide];

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

export const TRANSPORT_BELT_SIDE_GRID_OFFSETS: Readonly<Record<TransportBeltSide, readonly [x: number, y: number]>> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

export const TRANSPORT_BELT_FLOW_BY_VARIANT: Readonly<Record<string, TransportBeltFlow>> = {
  "horizontal-right": ["left", "right"],
  "horizontal-left": ["right", "left"],
  "vertical-up": ["bottom", "top"],
  "vertical-down": ["top", "bottom"],
  "angled-right-up": ["right", "top"],
  "angled-up-right": ["top", "right"],
  "angled-left-up": ["left", "top"],
  "angled-top-left": ["top", "left"],
  "angled-bottom-right": ["bottom", "right"],
  "angled-right-bottom": ["right", "bottom"],
  "angled-bottom-left": ["bottom", "left"],
  "angled-left-bottom": ["left", "bottom"],
  "start-bottom": ["bottom", "top"],
  "end-bottom": ["top", "bottom"],
  "start-left": ["left", "right"],
  "end-left": ["right", "left"],
  "start-top": ["top", "bottom"],
  "end-top": ["bottom", "top"],
  "start-right": ["right", "left"],
  "end-right": ["left", "right"],
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
  start: TransportBeltSide,
  end: TransportBeltSide,
): TransportBeltVariant | undefined {
  return TRANSPORT_BELT_VARIANT_BY_FLOW_KEY[`${start}:${end}`];
}
