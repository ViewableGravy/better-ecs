import { Color } from "@repo/engine/components";
import { defineContext } from "@repo/plugins";
import { DUNGEON, HOUSE, HOUSE_HALF_HEIGHT, HOUSE_HALF_WIDTH, OVERWORLD } from "../constants";
import { spawnBackground } from "../factories/spawnBackground";
import { spawnContextEntryRegion } from "../factories/spawnContextEntryRegion";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnHouse } from "../factories/spawnHouse";
import { spawnTree } from "../factories/spawnTree";
import { setupContextPlayer } from "./shared";

export function defineOverworldContext() {
  return defineContext({
    id: OVERWORLD,
    policy: {
      visibility: "stack",
      simulation: "focused-only",
    },
    setup(world) {
      setupContextPlayer(world, -320, 0);

      spawnBackground(world, {
        width: 1200,
        height: 800,
        color: new Color(0.15, 0.2, 0.25, 1),
        role: "outside",
      });

      spawnHouse(world, {
        x: 0,
        y: 0,
        width: HOUSE_HALF_WIDTH * 2,
        height: HOUSE_HALF_HEIGHT * 2,
        contextId: HOUSE,
      });

      spawnContextEntryRegion(world, {
        topLeftX: -HOUSE_HALF_WIDTH,
        topLeftY: -HOUSE_HALF_HEIGHT,
        width: HOUSE_HALF_WIDTH * 2,
        height: HOUSE_HALF_HEIGHT * 2,
        targetContextId: HOUSE,
      });

      spawnTree(world, { x: -260, y: -140 });
      spawnTree(world, { x: -340, y: 90 });
      spawnTree(world, { x: -190, y: 190 });
      spawnTree(world, { x: 320, y: -130 });
      spawnTree(world, { x: 260, y: 170 });
      spawnTree(world, { x: 120, y: 250 });
      spawnTree(world, { x: -40, y: -270 });

      spawnDoor(world, {
        x: 0,
        y: -220,
        fill: new Color(0.5, 0.65, 1, 1),
        role: "outside",
        portal: {
          mode: "teleport",
          targetContextId: DUNGEON,
          spawn: { x: 0, y: 160 },
          label: "Overworld -> Dungeon",
        },
      });
    },
  });
}
