import { Color } from "@repo/engine/components";
import { defineContext } from "@repo/plugins";
import { DUNGEON, OVERWORLD } from "../constants";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnDungeon } from "../factories/spawnDungeon";
import { setupContextPlayer } from "./shared";

export function defineDungeonContext() {
  return defineContext({
    id: DUNGEON,
    parentId: OVERWORLD,
    policy: {
      visibility: "focused-only",
      simulation: "focused-only",
    },
    setup(world) {
      setupContextPlayer(world, 0, 160);
      spawnDungeon(world);

      spawnDoor(world, {
        x: 50,
        y: 220,
        fill: new Color(0.95, 0.4, 0.35, 1),
        role: "outside",
        portal: {
          mode: "teleport",
          targetContextId: OVERWORLD,
          spawn: { x: 0, y: 40 },
          label: "Dungeon -> Overworld",
        },
      });
    },
  });
}
