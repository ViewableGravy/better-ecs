import {
    PlayerComponent,
    type PlayerAnimationState,
} from "@client/components/player";
import { PLAYER_GROUNDED_HITBOX_RADIUS } from "@client/entities/player";
import {
    createPlayerSprite,
    resolvePlayerSpriteDepthSortY,
    resolvePlayerSpriteZOrder,
} from "@client/entities/player/render/createPlayerSprite";
import { ensurePlayerSprite } from "@client/entities/player/render/ensurePlayerSprite";
import { resolveDirectionFromAxes } from "@client/systems/core/movement/utilities";
import { createSystem, mutate } from "@engine";
import { AnimatedSprite, Transform2D } from "@engine/components";
import { System as ContextSystem, Delta, fromContext, World } from "@engine/context";

export const System = createSystem("main:player-movement-authority")({
  system() {
    const world = fromContext(World);
    const { data } = fromContext(ContextSystem("main:local-player-movement-intent"));
    const [updateDelta] = fromContext(Delta);

    const [playerId] = world.invariantQuery(PlayerComponent);
    const player = world.require(playerId, PlayerComponent);
    const transform = world.require(playerId, Transform2D);

    const animatedSprite = ensurePlayerSprite(world, playerId, player.animationState, player.direction);
    const { x, y } = data;
    const speed = 100 * (updateDelta / 1000);

    if (x !== 0 || y !== 0) {
      mutate(transform, "curr", (curr) => {
        if (x !== 0) {
          curr.pos.x += x * speed;
        }

        if (y !== 0) {
          curr.pos.y += y * speed;
        }
      });
    }

    const playerBottomY = transform.curr.pos.y + PLAYER_GROUNDED_HITBOX_RADIUS;
    animatedSprite.zOrder = resolvePlayerSpriteZOrder(resolvePlayerSpriteDepthSortY(playerBottomY));

    const nextAnimationState: PlayerAnimationState = x === 0 && y === 0 ? "idle" : "moving";
    const nextDirection = resolveDirectionFromAxes(x, y) ?? player.direction;

    if (player.animationState === nextAnimationState && player.direction === nextDirection) {
      return;
    }

    player.animationState = nextAnimationState;
    player.direction = nextDirection;

    world.remove(playerId, AnimatedSprite);
    world.add(playerId, AnimatedSprite, createPlayerSprite(nextAnimationState, nextDirection, animatedSprite));
  },
});
