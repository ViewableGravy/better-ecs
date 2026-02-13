import { Color } from "@repo/engine/components";
import { defineContext } from "@repo/spatial-contexts";
import { DUNGEON, HOUSE, HOUSE_HALF_HEIGHT, HOUSE_HALF_WIDTH, OVERWORLD } from "../constants";
import { spawnBackground } from "../factories/spawnBackground";
import { spawnChair } from "../factories/spawnChair";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnTable } from "../factories/spawnTable";
import { setupContextPlayer } from "./shared";

export function defineHouseContext() {
  return defineContext({
    id: HOUSE,
    parentId: OVERWORLD,
    policy: {
      visibility: "stack",
      simulation: "focused-only",
    },
    setup(world) {
      setupContextPlayer(world, 0, 0);

      spawnBackground(world, {
        width: HOUSE_HALF_WIDTH * 2,
        height: HOUSE_HALF_HEIGHT * 2,
        color: new Color(0.4, 0.3, 0.2, 1),
        stroke: new Color(0.18, 0.1, 0.07, 1),
        strokeWidth: 6,
        role: "house-interior",
      });

      spawnTable(world, { x: -60, y: -30, radius: 28 });
      spawnTable(world, { x: 120, y: 70, radius: 24 });
      spawnChair(world, { x: -120, y: -30 });
      spawnChair(world, { x: -10, y: -30 });
      spawnChair(world, { x: 120, y: 100 });
      spawnChair(world, { x: 140, y: 70 });

      spawnDoor(world, {
        x: 120,
        y: 0,
        fill: new Color(0.85, 0.85, 0.85, 1),
        role: "house-interior",
        portal: {
          mode: "teleport",
          targetContextId: DUNGEON,
          spawn: { x: 0, y: 160 },
          label: "House -> Dungeon",
        },
      });
    },
  });
}
