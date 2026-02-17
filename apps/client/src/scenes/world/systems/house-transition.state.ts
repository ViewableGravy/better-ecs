export const HOUSE_TRANSITION_DURATION_SECONDS = 1;

const EPSILON = 0.0001;

const transition = {
  blend: 0,
  previousBlend: 0,
  targetBlend: 0,
};

export function setHouseInsideTarget(insideHouse: boolean): void {
  transition.targetBlend = insideHouse ? 1 : 0;
}

export function tickHouseTransition(updateDeltaMs: number): void {
  transition.previousBlend = transition.blend;
  const step = getTransitionStep(updateDeltaMs, HOUSE_TRANSITION_DURATION_SECONDS);
  transition.blend = approach(transition.blend, transition.targetBlend, step);
}

export function getHouseBlend(alpha = 1): number {
  return transition.previousBlend + (transition.blend - transition.previousBlend) * alpha;
}

export function isHouseBlendOutsideComplete(): boolean {
  return transition.blend <= EPSILON;
}

function getTransitionStep(updateDeltaMs: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 1;

  const durationMs = durationSeconds * 1000;
  return Math.min(updateDeltaMs / durationMs, 1);
}

function approach(current: number, target: number, step: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= step) return target;
  return current + Math.sign(delta) * step;
}
