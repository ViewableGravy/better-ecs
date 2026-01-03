import { createInitializationSystem, useWorld, Vec3 } from "@repo/engine";
import { PlayerComponent } from "../../components/player";
import { PreviousPosition } from "../../components/previousPosition";

export const System = createInitializationSystem(() => {
  const world = useWorld();

  const player = world.create();
  const position = new Vec3(100, 100, 0);
  const previousPosition = new PreviousPosition(100, 100, 0);
  const playerComponent = new PlayerComponent("Player1");

  world.add(player, position);
  world.add(player, previousPosition);
  world.add(player, playerComponent);
})