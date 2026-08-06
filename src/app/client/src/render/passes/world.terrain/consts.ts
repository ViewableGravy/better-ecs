import type { TerrainKind } from "@client/systems/terrain/types";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
export const SQRT_3 = Math.sqrt(3);
export const BASE_STRIDE = 8;
export const TERRAIN_COLORS: Record<TerrainKind, readonly [number, number, number, number]> = {
  grass: [0.22, 0.58, 0.24, 1],
  ice: [0.82, 0.92, 0.98, 1],
  water: [0.12, 0.38, 0.78, 1],
};
