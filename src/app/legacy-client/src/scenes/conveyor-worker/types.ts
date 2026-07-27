/** Shared types for the conveyor worker simulation. */

/** Direction a belt flows toward. */
export type BeltDirection = "north" | "east" | "south" | "west";

/** A belt flow: items enter from tail, exit toward head. */
export type BeltFlow = readonly [tail: BeltDirection, head: BeltDirection];

/** All 20 belt variants. */
export const BELT_VARIANTS = [
  "horizontal-right", "horizontal-left", "vertical-up", "vertical-down",
  "angled-right-up", "angled-up-right", "angled-left-up", "angled-top-left",
  "angled-bottom-right", "angled-right-bottom", "angled-bottom-left", "angled-left-bottom",
  "start-bottom", "end-bottom", "start-left", "end-left",
  "start-top", "end-top", "start-right", "end-right",
] as const;

export type BeltVariant = (typeof BELT_VARIANTS)[number];

export type BeltSide = "left" | "right";

export const BELT_HALF_SIZE = 10;
export const CELL_SIZE = 20;

/** Direction grid offsets (for neighbor lookups). */
export const DIRECTION_OFFSETS: Record<BeltDirection, readonly [number, number]> = {
  north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0],
};

export const OPPOSITE_DIRECTION: Record<BeltDirection, BeltDirection> = {
  north: "south", east: "west", south: "north", west: "east",
};

/** Flows keyed by variant string. */
export const BELT_FLOWS: Record<string, BeltFlow> = {
  "horizontal-right":   ["west", "east"],
  "horizontal-left":    ["east", "west"],
  "vertical-up":        ["south", "north"],
  "vertical-down":      ["north", "south"],
  "angled-right-up":    ["east", "north"],
  "angled-up-right":    ["north", "east"],
  "angled-left-up":     ["west", "north"],
  "angled-top-left":    ["north", "west"],
  "angled-bottom-right":["south", "east"],
  "angled-right-bottom":["east", "south"],
  "angled-bottom-left": ["south", "west"],
  "angled-left-bottom": ["west", "south"],
  "start-bottom":       ["south", "north"],
  "end-bottom":         ["north", "south"],
  "start-left":         ["west", "east"],
  "end-left":           ["east", "west"],
  "start-top":          ["north", "south"],
  "end-top":            ["south", "north"],
  "start-right":        ["east", "west"],
  "end-right":          ["west", "east"],
};

/** Look up a flow by variant. */
export function getFlow(variant: BeltVariant): BeltFlow {
  return BELT_FLOWS[variant]!;
}

/** Determine if a variant can store items (start/end terminals cannot). */
export function canStoreEntities(variant: BeltVariant): boolean {
  return !variant.startsWith("start-") && !variant.startsWith("end-");
}

/** Determine if a flow is straight (not curved). */
export function isStraightFlow(flow: BeltFlow): boolean {
  const [tail, head] = flow;
  return OPPOSITE_DIRECTION[tail] === head;
}

/** Which variants are curves (not straight and not terminals). */
const CURVE_VARIANTS = new Set([
  "angled-right-up", "angled-up-right", "angled-left-up", "angled-top-left",
  "angled-bottom-right", "angled-right-bottom", "angled-bottom-left", "angled-left-bottom",
]);

export function isCurve(variant: BeltVariant): boolean {
  return CURVE_VARIANTS.has(variant);
}

/** Find the variant that matches a given flow direction pair. */
const VARIANT_BY_FLOW_KEY: Record<string, BeltVariant> = {};

for (const variant of BELT_VARIANTS) {
  const flow = BELT_FLOWS[variant];
  if (flow) {
    VARIANT_BY_FLOW_KEY[`${flow[0]}:${flow[1]}`] = variant;
  }
}

export function getVariantByFlow(tail: BeltDirection, head: BeltDirection): BeltVariant | undefined {
  return VARIANT_BY_FLOW_KEY[`${tail}:${head}`];
}

/**
 * For curves, which lane is inside vs outside.
 * [inside, outside] — inside lane advances at 2x speed.
 */
const CURVE_LANE_SIDES: Record<string, readonly [BeltSide, BeltSide]> = {
  "angled-right-up":     ["right", "left"],
  "angled-up-right":     ["left", "right"],
  "angled-left-up":      ["left", "right"],
  "angled-top-left":     ["right", "left"],
  "angled-bottom-right": ["right", "left"],
  "angled-right-bottom": ["left", "right"],
  "angled-bottom-left":  ["left", "right"],
  "angled-left-bottom":  ["right", "left"],
};

export function getCurveLaneSides(variant: BeltVariant): readonly [inside: BeltSide | null, outside: BeltSide | null] {
  return CURVE_LANE_SIDES[variant] ?? [null, null];
}

/** Slots per lane. */
export const SLOT_COUNT = 4;
export const SLOT_ADVANCE_TICKS = 16;
export const INSIDE_CURVE_SLOT_ADVANCE_TICKS = 8;
export const PROGRESS_SEAM_EPSILON = 1e-9;
export const MAX_PROGRESS = 1 - PROGRESS_SEAM_EPSILON;

export type GridCoord = number;
export type GridPos = readonly [x: GridCoord, y: GridCoord];

export function worldToGrid(x: number, y: number): GridPos {
  return [
    Math.floor((x + CELL_SIZE / 2) / CELL_SIZE) as GridCoord,
    Math.floor((y + CELL_SIZE / 2) / CELL_SIZE) as GridCoord,
  ];
}

export function gridToWorld(gx: GridCoord, gy: GridCoord): readonly [number, number] {
  return [gx * CELL_SIZE, gy * CELL_SIZE];
}

export function gridKey(gx: GridCoord, gy: GridCoord): string {
  return `${gx},${gy}`;
}

export function adjacentGrid(gx: GridCoord, gy: GridCoord, dir: BeltDirection): GridPos {
  const [dx, dy] = DIRECTION_OFFSETS[dir];
  return [(gx + dx) as GridCoord, (gy + dy) as GridCoord];
}
