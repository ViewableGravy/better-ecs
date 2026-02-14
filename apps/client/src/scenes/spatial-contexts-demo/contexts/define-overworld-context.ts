import { Color } from "@repo/engine/components";
import { defineContext, type ContextId } from "@repo/spatial-contexts";
import { spawnBackground } from "../factories/spawnBackground";
import { spawnContextEntryRegion } from "../factories/spawnContextEntryRegion";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnHouse } from "../factories/spawnHouse";
import { spawnTree } from "../factories/spawnTree";
import { setupContextPlayer } from "./shared";

type OverworldContextOptions = {
  overworldId: ContextId;
  houseId: ContextId;
  dungeonId: ContextId;
  houseHalfWidth: number;
  houseHalfHeight: number;
};

export function defineOverworldContext(options: OverworldContextOptions) {
  return defineContext({
    id: options.overworldId,
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
        width: options.houseHalfWidth * 2,
        height: options.houseHalfHeight * 2,
        contextId: options.houseId,
      });

      spawnContextEntryRegion(world, {
        topLeftX: -options.houseHalfWidth,
        topLeftY: -options.houseHalfHeight,
        width: options.houseHalfWidth * 2,
        height: options.houseHalfHeight * 2,
        targetContextId: options.houseId,
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
          targetContextId: options.dungeonId,
          spawn: { x: 0, y: 160 },
          label: "Overworld -> Dungeon",
        },
      });
    },
  });
}
