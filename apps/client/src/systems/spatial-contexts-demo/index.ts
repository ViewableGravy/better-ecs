import { createSystem, useWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import z from "zod";

import { PlayerComponent } from "@/components/player";
import { ensurePlayer } from "@/entities/player";
import { contextId, useContextManager } from "@repo/plugins";

const OVERWORLD = contextId("default");
const HOUSE = contextId("house_1");

export const System = createSystem("client:spatial-contexts-demo")({
  phase: "update",
  schema: {
    default: {},
    schema: z.object({}),
  },
  system() {
    const manager = useContextManager();
    const world = useWorld();

    const focused = manager.getFocusedContextId();

    const [playerId] = world.query(PlayerComponent);
    if (!playerId) return;

    const transform = world.get(playerId, Transform2D);
    if (!transform) return;

    // Simple threshold demo (no teleport):
    // - walk right in overworld -> focus house
    // - walk left in house -> focus overworld
    if (focused === OVERWORLD && transform.curr.pos.x > 200) {
      const houseWorld = manager.getWorldOrThrow(HOUSE);
      ensurePlayer(houseWorld);
      void manager.setFocusedContextId(HOUSE);
      return;
    }

    if (focused === HOUSE && transform.curr.pos.x < -200) {
      const overworld = manager.getWorldOrThrow(OVERWORLD);
      ensurePlayer(overworld);
      void manager.setFocusedContextId(OVERWORLD);
    }
  },
});
