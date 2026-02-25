export type DeltaSnapshot = {
  updateDelta: number;
  frameDelta: number;
  updateShouldRun: boolean;
  frameShouldRun: boolean;
};

export class DeltaState {
  #lastUpdateTime = 0;
  #lastFrameTime = 0;
  #snapshot: DeltaSnapshot = {
    updateDelta: 0,
    frameDelta: 0,
    updateShouldRun: false,
    frameShouldRun: false,
  };

  public initialize(now: number): void {
    this.#lastUpdateTime = now;
    this.#lastFrameTime = now;
  }

  public calculate(now: number, fps: number, ups: number): DeltaSnapshot {
    const frameTime = 1000 / fps;
    const updateTime = 1000 / ups;

    const updateDelta = now - this.#lastUpdateTime;
    const frameDelta = now - this.#lastFrameTime;

    const frameTolerance = frameTime * 0.15;
    const updateTolerance = updateTime * 0.15;

    this.#snapshot.updateDelta = updateDelta;
    this.#snapshot.frameDelta = frameDelta;
    this.#snapshot.updateShouldRun = updateDelta >= updateTime - updateTolerance;
    this.#snapshot.frameShouldRun = frameDelta >= frameTime - frameTolerance;

    return this.#snapshot;
  }

  public markUpdated(now: number): void {
    this.#lastUpdateTime = now;
  }

  public markFramed(now: number): void {
    this.#lastFrameTime = now;
  }
}
