import { proxy } from "valtio";

type RunningStateStore = {
  paused: boolean;
};

export type EngineRunningState = RunningStateStore & {
  pause: () => void;
  resume: () => void;
  toggle: () => boolean;
};

type EngineRunningStateOptions = {
  onPause?: () => void;
  onResume?: () => void;
};

export function createEngineRunningState(options?: EngineRunningStateOptions): EngineRunningState {
  const state = proxy<RunningStateStore>({
    paused: false,
  });

  return Object.assign(state, {
    pause: () => {
      if (state.paused) {
        return;
      }

      state.paused = true;
      options?.onPause?.();
    },
    resume: () => {
      if (!state.paused) {
        return;
      }

      state.paused = false;
      options?.onResume?.();
    },
    toggle: () => {
      state.paused = !state.paused;

      if (state.paused) {
        options?.onPause?.();
      } else {
        options?.onResume?.();
      }

      return state.paused;
    },
  });
}