import { Vec2 } from "@engine/math/vec/vec2";

export function dotNormalized(ax: number, ay: number, bx: number, by: number): number {
  const magnitudeA = Math.hypot(ax, ay);
  const magnitudeB = Math.hypot(bx, by);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return (ax * bx + ay * by) / (magnitudeA * magnitudeB);
}

export function setNormalized(out: Vec2, x: number, y: number, fallback: Vec2): void {
  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) {
    out.set(fallback.x, fallback.y);
    return;
  }

  out.set(x / magnitude, y / magnitude);
}
