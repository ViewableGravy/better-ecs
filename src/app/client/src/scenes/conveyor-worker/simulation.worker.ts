/**
 * Web Worker entry point for the conveyor simulation.
 *
 * Runs the `ConveyorSimulation` engine on a setInterval loop (30 updates/sec).
 * Communicates with the main thread via postMessage with transferable ArrayBuffers.
 */

import type { ConveyorRequest, ConveyorResponse } from "@client/scenes/conveyor-worker/protocol";
import { ConveyorSimulation } from "@client/scenes/conveyor-worker/simulation";

const sim = new ConveyorSimulation();
let simInterval: number | undefined;

self.onmessage = (event: MessageEvent<ConveyorRequest>) => {
  const msg = event.data;

  if (msg.type === "init") {
    sim.reconstructFromLayout(msg.layout);
    startTicking();
    const response: ConveyorResponse = { type: "inited", beltCount: sim.belts.filter(Boolean).length };
    self.postMessage(response);
    return;
  }

  if (msg.type === "commands") {
    for (const cmd of msg.commands) {
      if (cmd.type === "place") {
        sim.placeBeltWithVariant(cmd.worldX, cmd.worldY, cmd.variant ?? null);
      } else if (cmd.type === "remove") {
        sim.removeBelt(cmd.worldX, cmd.worldY);
      } else if (cmd.type === "place-item") {
        sim.placeItem(cmd.beltX, cmd.beltY, cmd.side, cmd.slotIndex, cmd.itemType);
      }
    }

    self.postMessage({ type: "acked" } satisfies ConveyorResponse);
    return;
  }
};

function startTicking(): void {
  if (simInterval !== undefined) {
    return;
  }

  // 30 updates per second
  simInterval = setInterval(() => {
    const snapshot = sim.update();
    if (snapshot) {
      const response: ConveyorResponse = {
        type: "snapshot",
        positions: snapshot.positions,
        itemCount: snapshot.itemCount,
        tick: snapshot.tick,
      };
      self.postMessage(response, [snapshot.positions.buffer]);
    }
  }, 1000 / 30) as unknown as number;
}
