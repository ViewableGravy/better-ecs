export type BlendTransitionAlgorithm = "linear";

/**
 * Component-only transition state.
 */
export class BlendTransition {
  constructor(
    public curr: number = 0,
    public prev: number = 0,
    public target: number = 0,
    public durationMs: number = 1000,
    public algorithm: BlendTransitionAlgorithm = "linear",
  ) {}
}

/**
 * Reusable mutator that operates on a BlendTransition component instance.
 */
export class BlendTransitionMutator {
  private static readonly epsilon = 0.0001;
  private transition: BlendTransition | null = null;

  public setTarget(target: number) {
    const transition = this.requireTransition();
    transition.target = target;
  }

  public get complete(): boolean {
    const transition = this.requireTransition();
    return Math.abs(transition.curr - transition.target) <= BlendTransitionMutator.epsilon;
  }

  set(transition: BlendTransition): this {
    this.transition = transition;
    return this;
  }

  unset(): void {
    this.transition = null;
  }

  tick(updateDeltaMs: number): void {
    const transition = this.requireTransition();
    transition.prev = transition.curr;

    const step = this.getTransitionStep(updateDeltaMs, transition.durationMs);
    transition.curr = this.approach(transition, step);
  }

  sample(alpha: number = 1): number {
    const transition = this.requireTransition();
    return transition.prev + (transition.curr - transition.prev) * alpha;
  }

  private requireTransition(): BlendTransition {
    if (!this.transition) {
      throw new Error("BlendTransitionMutator has no active transition. Call set() first.");
    }

    return this.transition;
  }

  private getTransitionStep(updateDeltaMs: number, durationMs: number): number {
    if (durationMs <= 0) {
      return 1;
    }

    return Math.min(updateDeltaMs / durationMs, 1);
  }

  private approach(transition: BlendTransition, step: number): number {
    if (transition.algorithm === "linear") {
      const delta = transition.target - transition.curr;
      if (Math.abs(delta) <= step) {
        return transition.target;
      }

      return transition.curr + Math.sign(delta) * step;
    }

    throw new Error(`Unsupported blend transition algorithm: ${transition.algorithm}`);
  }
}
