/**
 * Manages the blend value for transitioning from one value to another. This provides
 * a smooth interpolation between values over a specified duration, using a chosen algorithm.
 */
export class BlendTransition {
  private static epsilon = 0.0001;
  private _curr: number;
  private _prev: number;
  private _target: number;

  constructor(
    private readonly durationMs: number, 
    initial: number = 0,
    private readonly algorithm: "linear" = "linear",
  ) {
    this._curr = initial;
    this._prev = initial;
    this._target = initial;
  }

  public set target(target: number) {
    this._target = target;
  }

  /**
   * Returns the current blend value, interpolated using the desired algorithm.
   */
  public get blend(): number {
    return this._prev + (this._curr - this._prev);
  }

  /**
   * Returns true if the current blend value is within epsilon of the target, indicating the transition is complete.
   */
  public get complete(): boolean {
    return Math.abs(this._curr - this._target) <= BlendTransition.epsilon;
  }

  /**
   * Advances the transition by the given delta time, updating the current blend value towards the target.
   */
  public tick(updateDeltaMs: number): void {
    this._prev = this._curr;
    const step = this.getTransitionStep(updateDeltaMs);
    this._curr = this.approach(step);
  }

  private getTransitionStep(updateDeltaMs: number): number {
    if (this.durationMs <= 0) return 1;
    return Math.min(updateDeltaMs / this.durationMs, 1);
  }

  private approach(step: number): number {
    if (this.algorithm === "linear") {
      const delta = this._target - this._curr;
      if (Math.abs(delta) <= step) return this._target;
      return this._curr + Math.sign(delta) * step;
    }

    throw new Error(`Unsupported blend transition algorithm: ${this.algorithm}`);
  }
}
