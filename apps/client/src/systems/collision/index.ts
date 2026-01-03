import { createSystem, useEngine } from "@repo/engine/core";
import z from "zod";

export const System = createSystem("collision")({
  system: Entrypoint,
  schema: {
    default: {},
    schema: z.object({}),
  },
});

function Entrypoint() {
  const engine = useEngine();
  engine.systems;
}
