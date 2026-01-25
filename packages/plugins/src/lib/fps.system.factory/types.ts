import type { KeyBind } from "@repo/engine";
import { z } from "zod";

/***** SCHEMA *****/
export const schema = z.object({
  fps: z.array(z.number()),
  ups: z.array(z.number()),
  fpsBuffer: z.object({
    start: z.number().nullable(),
    frames: z.number(),
  }),
  upsBuffer: z.object({
    start: z.number().nullable(),
    updates: z.number(),
  }),
  mode: z.enum(["simple", "default", "advanced"]),
  customFps: z.number().nullable(),
  customUps: z.number().nullable(),
});

export type FPSCounterData = z.infer<typeof schema>;

/***** TYPE DEFINITIONS *****/
export type DisplayMode = "simple" | "default" | "advanced";

export type Opts = {
  element: HTMLElement;
  barCount?: number;
  rate?: number;
  round?: boolean;
  modeToggleKey?: KeyBind;
  defaultMode?: DisplayMode;
};
