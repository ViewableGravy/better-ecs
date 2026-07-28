type Opts = {
  /** Frame rate in frames per second */
  fps?: number;

  /** Update rate in updates per second */
  ups?: number;

  /** Abort signal to stop the frame requests */
  signal?: AbortSignal;
}

export type EngineUpdate = {
  readonly delta: number;
  readonly shouldUpdate: boolean;
}

export type EngineFrame = {
  readonly delta: number;
  readonly shouldUpdate: boolean;
}

export async function* startEngine(opts?: Opts) {
  const frameTime = 1000 / (opts?.fps || 60)
  const updateTime = 1000 / (opts?.ups || 60)

  let lastUpdateTime = performance.now()
  let lastFrameTime = performance.now()

  const updateState = {
    delta: 0,
    shouldUpdate: false
  } as EngineUpdate

  const frameState = {
    delta: 0,
    shouldUpdate: false
  } as EngineFrame

  const requestAnimationFrame = (cb: (time: number) => void) => {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      return window.requestAnimationFrame(cb);
    }

    return setTimeout(() => cb(performance.now()), frameTime);
  }

  while (!opts?.signal?.aborted) {
    const now = await new Promise<number>(requestAnimationFrame)

    const updateDelta = now - lastUpdateTime
    const frameDelta = now - lastFrameTime

    const updateShouldRun = updateDelta >= updateTime
    const frameShouldRun = frameDelta >= frameTime

    if (updateShouldRun || frameShouldRun) {
      (updateState as any).delta = updateDelta;
      (updateState as any).shouldUpdate = updateShouldRun;
      (frameState as any).delta = frameDelta;
      (frameState as any).shouldUpdate = frameShouldRun;

      yield [updateState, frameState] as const

      if (updateShouldRun) {
        lastUpdateTime = now
      }
      if (frameShouldRun) {
        lastFrameTime = now
      }
    }
  }
}
