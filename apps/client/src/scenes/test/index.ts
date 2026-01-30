import { createScene,useWorld } from "@repo/engine";
import { Transform } from "@repo/engine/components";
import { PlayerComponent } from "../../components/player";


export const Scene = createScene("TestScene")({
  setup() {
    const world = useWorld();

    const player = world.create();
    const transform = new Transform(100, 100, 0);
    const playerComponent = new PlayerComponent("Player1");

    world.add(player, transform);
    world.add(player, playerComponent);
  }
})