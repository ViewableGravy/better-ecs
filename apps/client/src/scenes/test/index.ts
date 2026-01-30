import { createScene, EntityId, useWorld } from "@repo/engine";
import { Transform } from "@repo/engine/components";
import { PlayerComponent } from "../../components/player";


export const Scene = createScene("TestScene")({
  setup() {
    useCreatePlayer()
  }
})

// TODO: move to hooks file (or entities/player file)
function usePlayer() {
  const world = useWorld();

  let [player] = world.query(PlayerComponent);

  if (!player) {
    player = useCreatePlayer();
  }

  return player;
}

function useCreatePlayer() {
  const world = useWorld();

  const player = world.create();
  const transform = new Transform(100, 100, 0);
  const playerComponent = new PlayerComponent("NewPlayer");

  world.add(player, transform);
  world.add(player, playerComponent);

  return player;
}