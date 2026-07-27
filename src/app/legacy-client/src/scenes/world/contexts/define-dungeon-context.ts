import { spawnDoor } from "@legacy/entities/door";
import { spawnDungeon } from "@legacy/entities/dungeon";
import type { Registry } from "@engine";
import { Rgba } from "@engine/components";

type DungeonContextOptions = {
  overworldDestination: { x: number; y: number };
};

export function setupDungeon(world: Registry, options: DungeonContextOptions): void {
      spawnDungeon(world);

      spawnDoor(world, {
        x: 50,
        y: 220,
        fill: new Rgba(0.95, 0.4, 0.35, 1),
        portal: {
          destination: options.overworldDestination,
          label: "Dungeon -> Overworld",
        },
      });
}
