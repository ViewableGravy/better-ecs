import { PlayerComponent } from "@/components/player";
import { ensurePlayer } from "@/entities/player";
import { createSystem, useDelta, useWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { useContextManager } from "@repo/plugins";
import z from "zod";
import { HOUSE, OVERWORLD, isInsideHouse } from "../constants";
import {
  isHouseBlendOutsideComplete,
  setHouseInsideTarget,
  tickHouseTransition,
} from "./house-transition.state";

export const HouseContextSystem = createSystem("client:house-context")({
  phase: "update",
  schema: {
    default: {},
    schema: z.object({}),
  },
  system() {
    const manager = useContextManager();
    const world = useWorld();
    const [updateDelta] = useDelta();

    tickHouseTransition(updateDelta);

    const [playerId] = world.query(PlayerComponent);
    if (!playerId) return;

    const transform = world.get(playerId, Transform2D);
    if (!transform) return;

    const focused = manager.getFocusedContextId();
    const x = transform.curr.pos.x;
    const y = transform.curr.pos.y;
    const insideHouse = isInsideHouse(x, y);

    if (focused !== OVERWORLD && focused !== HOUSE) {
      setHouseInsideTarget(false);
      return;
    }

    if (focused === OVERWORLD) {
      setHouseInsideTarget(insideHouse);

      if (!insideHouse) return;

      switchContext(manager, HOUSE, transform);
      return;
    }

    if (insideHouse) {
      setHouseInsideTarget(true);
      return;
    }

    setHouseInsideTarget(false);
    if (!isHouseBlendOutsideComplete()) return;

    switchContext(manager, OVERWORLD, transform);
  },
});

function switchContext(
  manager: ReturnType<typeof useContextManager>,
  next: typeof OVERWORLD | typeof HOUSE,
  sourceTransform: Transform2D,
): void {
  const target = manager.getWorldOrThrow(next);
  const targetPlayer = ensurePlayer(target);
  const targetTransform = target.get(targetPlayer, Transform2D);
  if (!targetTransform) return;

  targetTransform.curr.copyFrom(sourceTransform.curr);
  targetTransform.prev.copyFrom(sourceTransform.prev);

  manager.setFocusedContextId(next);
}
