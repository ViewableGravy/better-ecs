export function lerp(prev: number, current: number, alpha: number): number {
  return prev + (current - prev) * alpha;
}