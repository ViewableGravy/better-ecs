/**
 * Main ↔ Worker protocol for conveyor simulation.
 */

import type { BeltVariant } from "@legacy/scenes/conveyor-worker/types";

export type ConveyorRequest =
  | {
      type: "init";
      layout: ReadonlyArray<{ x: number; y: number; variant?: BeltVariant }>;
    }
  | {
      type: "commands";
      commands: ReadonlyArray<SimCommand>;
    };

export type SimCommand =
  | { type: "place"; worldX: number; worldY: number; variant?: BeltVariant }
  | { type: "remove"; worldX: number; worldY: number }
  | {
      type: "place-item";
      beltX: number;
      beltY: number;
      side: "left" | "right";
      slotIndex: number;
      itemType: string;
    };

export type ConveyorResponse =
  | { type: "inited"; beltCount: number }
  | { type: "snapshot"; positions: Float32Array; itemCount: number; tick: number }
  | { type: "acked" };

