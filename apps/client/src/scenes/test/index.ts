import { createScene, EntityId, useWorld } from "@repo/engine";
import { Camera, Color, Sprite, Transform2D } from "@repo/engine/components";
import { Assets, loadImage } from "@repo/engine/asset";
import { Texture } from "@repo/engine/texture";
import { PlayerComponent } from "../../components/player";


export const Scene = createScene("TestScene")({
  async setup() {
    // Load the player sprite asset (cached after first load)
    await Assets.load("player-sprite", () => loadImage("/sprites/player.png"));

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

  // Create a Texture from the cached image asset
  const image = Assets.get<HTMLImageElement>("player-sprite")!;
  const texture = new Texture(image);
  const sprite = new Sprite(texture, 40, 40);

  world.add(player, transform);
  world.add(player, playerComponent);
  world.add(player, sprite);

  return player;
}