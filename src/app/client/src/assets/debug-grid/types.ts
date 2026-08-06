import { createUniforms } from "@engine/asset";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
export const gridUniforms = createUniforms<{
  uRadius: number;
  uChunkScale: number;
  uLineColor: readonly [number, number, number, number];
  uHoveredTile: readonly [number, number];
  uHasHoveredTile: number;
  uHighlightColor: readonly [number, number, number, number];
}>();