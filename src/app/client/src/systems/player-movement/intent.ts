import { deriveMovementAxes, type MovementAxes } from "@client/systems/player-movement/utilities";
import { createSystem } from "@engine";
import { System as ContextSystem, fromContext } from "@engine/context";

const DEFAULT_INTENT: MovementAxes = { x: 0, y: 0 };

export const PlayerMovementIntent = createSystem("main:player-movement-intent")({
  state: DEFAULT_INTENT,
  system() {
    const { data: input } = fromContext(ContextSystem("engine:input"));
    const { data: intent } = fromContext(ContextSystem("main:player-movement-intent"));
    const axes = deriveMovementAxes(input.keysActive);

    intent.x = axes.x;
    intent.y = axes.y;
  },
});
