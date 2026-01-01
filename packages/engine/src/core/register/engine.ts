import { engine } from "@repo/engine/core/consts/engine";
import type { EngineSystem, RegisterableEngine, SystemsTuple } from "../types";

export function registerEngine<const TSystems extends SystemsTuple>(opts: { systems: TSystems }): RegisterableEngine<TSystems> {
  // sort systems into phases (retaining order within phase)
  engine.systems = Object.fromEntries(
    Object.entries<EngineSystem>(engine.systems)
      .sort(([, a], [, b]) => {
        const phaseOrder = { update: 0, render: 1 };
        return phaseOrder[a.phase] - phaseOrder[b.phase];
      })
  );

  return void 0 as any;
}
