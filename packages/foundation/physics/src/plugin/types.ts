import type { KeyBind } from "@repo/engine";
import { z } from "zod";

export type PhysicsOpts = {
  debug?: false | {
    keybind: KeyBind;
  };
};

export const debugStateSchema = z.object({
  visible: z.boolean(),
});

export type DebugState = z.infer<typeof debugStateSchema>;
