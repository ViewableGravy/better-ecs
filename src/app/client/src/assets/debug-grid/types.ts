import { createUniforms } from "@engine/asset";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
export const gridUniforms = createUniforms<{
  uRadius: number;
  uLineColor: readonly [number, number, number, number];
}>();