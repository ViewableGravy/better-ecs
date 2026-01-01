import { createSystem } from "@repo/engine/core/system";
import z from "zod";

export const System = createSystem("movement")({
  system: Entrypoint,
  schema: {
    default: {},
    schema: z.object({}),
  },
});

function Entrypoint() {
  const { engine } = System;

  engine.systems;
}
