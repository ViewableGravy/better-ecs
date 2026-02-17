import { Color } from "@repo/engine/components";
import { defineContext, type ContextId } from "@repo/spatial-contexts";
import { OUTSIDE } from "../components/render-visibility";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnDungeon } from "../factories/spawnDungeon";
import { setupContextPlayer } from "./shared";

type DungeonContextOptions = {
  overworldId: ContextId;
  dungeonId: ContextId;
};

export function defineDungeonContext(options: DungeonContextOptions) {
  return defineContext({
    id: options.dungeonId,
    parentId: options.overworldId,
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
        role: OUTSIDE,
        portal: {
          mode: "teleport",
          targetContextId: options.overworldId,
          spawn: { x: 0, y: 40 },
          label: "Dungeon -> Overworld",
        },
      });
    },
  });
}
