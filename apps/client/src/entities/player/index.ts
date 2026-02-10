import { PlayerComponent } from "@/components/player";
import type { EntityId, UserWorld } from "@repo/engine";
import { Assets } from "@repo/engine/asset";
import { Sprite, Texture, Transform2D } from "@repo/engine/components";

export function ensurePlayer(world: UserWorld) {
    let [player] = world.query(PlayerComponent);

    if (!player) {
        player = spawnPlayer(world);
    }

    return player;
}

export function spawnPlayer(world: UserWorld): EntityId {
    const player = world.create();
    const transform = new Transform2D(0, 0);
    const playerComponent = new PlayerComponent("NewPlayer");

    // Create a Texture from the cached image asset
    const image = Assets.getStrict<HTMLImageElement>("player-sprite");
    const texture = new Texture(image);
    const sprite = new Sprite(texture, 40, 40);

    world.add(player, transform);
    world.add(player, playerComponent);
    world.add(player, sprite);

    return player;
}
