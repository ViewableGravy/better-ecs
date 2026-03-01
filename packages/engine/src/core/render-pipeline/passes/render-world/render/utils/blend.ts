import { Color } from "@components/sprite/sprite";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function blendChannel(base: number, tint: number, amount: number): number {
  return base + (tint - base) * amount;
}

export function blendColor(base: Color, tint: Color, amount: number, out: Color): Color {
  out.r = blendChannel(base.r, tint.r, amount);
  out.g = blendChannel(base.g, tint.g, amount);
  out.b = blendChannel(base.b, tint.b, amount);
  out.a = base.a;
  return out;
}