import { Color } from "@engine/components";
import { defineContext, type ContextId } from "@lib/spatial-contexts";
import { OUTSIDE } from "@client/scenes/world/components/render-visibility";
import { spawnDoor } from "@client/scenes/world/factories/spawnDoor";
import { spawnDungeon } from "@client/scenes/world/factories/spawnDungeon";
import { setupContextCamera } from "@client/scenes/world/contexts/shared";

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
      setupContextCamera(world);
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
