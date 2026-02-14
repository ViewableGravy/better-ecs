import { Color } from "@repo/engine/components";
import { defineContext, type ContextId } from "@repo/spatial-contexts";
import { spawnBackground } from "../factories/spawnBackground";
import { spawnChair } from "../factories/spawnChair";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnTable } from "../factories/spawnTable";
import { setupContextPlayer } from "./shared";

type HouseContextOptions = {
  overworldId: ContextId;
  houseId: ContextId;
  dungeonId: ContextId;
  houseHalfWidth: number;
  houseHalfHeight: number;
};

export function defineHouseContext(options: HouseContextOptions) {
  return defineContext({
    id: options.houseId,
    parentId: options.overworldId,
    policy: {
      visibility: "stack",
      simulation: "focused-only",
    },
    setup(world) {
      setupContextPlayer(world, 0, 0);

      spawnBackground(world, {
        width: options.houseHalfWidth * 2,
        height: options.houseHalfHeight * 2,
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
          targetContextId: options.dungeonId,
          spawn: { x: 0, y: 160 },
          label: "House -> Dungeon",
        },
      });
    },
  });
}
