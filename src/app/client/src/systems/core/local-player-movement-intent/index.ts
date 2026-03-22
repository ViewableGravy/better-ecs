import { resolveMovementAxes, type MovementAxes } from "@client/systems/core/movement/utilities";
import { createSystem } from "@engine";
import { System as ContextSystem, fromContext } from "@engine/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type LocalPlayerMovementIntentState = MovementAxes;

const localPlayerMovementIntentStateDefault: LocalPlayerMovementIntentState = {
  x: 0,
  y: 0,
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:local-player-movement-intent")({
  state: localPlayerMovementIntentStateDefault,
  system() {
    const { data } = fromContext(ContextSystem("engine:input"));
    const { data: localPlayerMovementIntent } = fromContext(ContextSystem("main:local-player-movement-intent"));
    const movementAxes = resolveMovementAxes(data.keysActive);

    localPlayerMovementIntent.x = movementAxes.x;
    localPlayerMovementIntent.y = movementAxes.y;
  },
});