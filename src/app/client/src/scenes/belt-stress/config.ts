export const BELT_STRESS_PROFILE_ID = "worker-belt-position-stream";
export const BELT_STRESS_ITEM_COUNTS = [10_000, 50_000, 100_000, 500_000, 2_000_000, 5_000_000] as const;
export const DEFAULT_BELT_STRESS_ITEM_COUNT = 50_000;
export const BELT_STRESS_UPS = 30;
export const BELT_STRESS_COLUMNS = 128;
export const BELT_STRESS_ITEMS_PER_BELT = 8;
export const BELT_STRESS_BELT_SIZE = 40;
export const BELT_STRESS_ITEM_SIZE = 3;
export const BELT_STRESS_TICKS_PER_BELT = 16;
export const BELT_STRESS_TRANSFER_BUFFER_COUNT = 3;

export type BeltStressItemCount = (typeof BELT_STRESS_ITEM_COUNTS)[number];

export function requireBeltStressItemCount(value: number): BeltStressItemCount {
  const resolved = BELT_STRESS_ITEM_COUNTS.find((candidate) => candidate === value);
  if (resolved === undefined) {
    throw new Error(`Belt stress item count must be one of ${BELT_STRESS_ITEM_COUNTS.join(", ")}. Received ${value}.`);
  }

  return resolved;
}
