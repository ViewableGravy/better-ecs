import { createSystem } from "@repo/engine/core";
import z from "zod";

export const System = createSystem("input")({ 
  system: Entrypoint,
  enabled: true,
  phase: "update",
  schema: {
    default: {},
    schema: z.object({})
  },
});

function Entrypoint() {
   const { engine } = System;

}