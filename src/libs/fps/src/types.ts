import type { KeyBind } from "@engine";

/***** TYPE DEFINITIONS *****/
export type DisplayMode = "disabled" | "simple" | "default" | "advanced";

export type FPSCounterData = {
  fps: number[];
  ups: number[];
  fpsBuffer: {
    start: number | null;
    frames: number;
  };
  upsBuffer: {
    start: number | null;
    updates: number;
  };
  mode: DisplayMode;
  customFps: number | null;
  customUps: number | null;
};

export type Opts = {
  element: HTMLElement;
  barCount?: number;
  rate?: number;
  round?: boolean;
  modeToggleKey?: KeyBind;
  defaultMode?: DisplayMode;
};
