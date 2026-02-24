import { proxy } from "valtio";

type RunningStateStore = {
  paused: boolean;
};

export type EngineRunningState = RunningStateStore & {
  pause: () => void;
  resume: () => void;
  toggle: () => boolean;
};

export function createEngineRunningState(): EngineRunningState {
  const state = proxy<RunningStateStore>({
    paused: false,
  });

  return Object.assign(state, {
    pause: () => {
      state.paused = true;
    },
    resume: () => {
      state.paused = false;
    },
    toggle: () => {
      state.paused = !state.paused;
      return state.paused;
    },
  });
}