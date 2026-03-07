export { CONVEYOR_SLOT_POSITIONS } from "@client/entities/transport-belt/slot-lookup";

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
