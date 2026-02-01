import { createScene, EntityId, useWorld } from "@repo/engine";
import { Camera, Color, Shape, Transform2D } from "@repo/engine/components";
import { PlayerComponent } from "../../components/player";


export const Scene = createScene("TestScene")({
  setup() {
    useCamera();
    usePlayer();
  }
})

function useCamera() {
  const world = useWorld();
  
  const cameraEntity = world.create();
  world.add(cameraEntity, new Transform2D(0, 0));
  world.add(cameraEntity, new Camera("orthographic", 300)); // orthoSize of 300 world units
}

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
  const transform = new Transform2D(0, 0);
  const playerComponent = new PlayerComponent("NewPlayer");
  const shape = new Shape(
    "rectangle",
    40,
    40,
    new Color(0.2, 0.8, 0.9, 1), // Cyan fill
    new Color(0.1, 0.5, 0.6, 1), // Darker cyan stroke
    2,
    0
  );

  world.add(player, transform);
  world.add(player, playerComponent);
  world.add(player, shape);

  return player;
}