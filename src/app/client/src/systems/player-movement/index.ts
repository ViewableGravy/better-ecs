import { PlayerComponent, type PlayerAnimationState } from "@client/components/player";
import { PLAYER_GROUNDED_HITBOX_RADIUS } from "@client/entities/player";
import {
  createPlayerSprite,
  derivePlayerSpriteZOrder,
} from "@client/entities/player/render/create-player-sprite";
import {
  deriveDirection,
  deriveMovementScale,
} from "@client/systems/player-movement/utilities";
import { createSystem } from "@engine";
import { AnimatedSprite, Transform2D } from "@engine/components";
import { ActiveRegistry, Delta, System as ContextSystem, fromContext } from "@engine/context";

const PLAYER_SPEED = 100;

export const PlayerMovement = createSystem("main:player-movement")({
  system() {
    const world = fromContext(ActiveRegistry);
    const { data: intent } = fromContext(ContextSystem("main:player-movement-intent"));
    const [updateDelta] = fromContext(Delta);
    const [playerId] = world.invariantQuery(PlayerComponent, Transform2D, AnimatedSprite);
    const player = world.require(playerId, PlayerComponent);
    const transform = world.require(playerId, Transform2D);
    const sprite = world.require(playerId, AnimatedSprite);
    const scale = deriveMovementScale(intent.x, intent.y);
    const distance = PLAYER_SPEED * (updateDelta / 1000) * scale;

    if (intent.x !== 0 || intent.y !== 0) {
      world.patch(playerId, Transform2D, (patchedTransform) => {
        patchedTransform.curr.pos.x += intent.x * distance;
        patchedTransform.curr.pos.y += intent.y * distance;
      });
    }

    sprite.zOrder = derivePlayerSpriteZOrder(transform.curr.pos.y + PLAYER_GROUNDED_HITBOX_RADIUS);

    const nextAnimationState: PlayerAnimationState = intent.x === 0 && intent.y === 0 ? "idle" : "moving";
    const nextDirection = deriveDirection(intent.x, intent.y) ?? player.direction;

    if (player.animationState === nextAnimationState && player.direction === nextDirection) {
      return;
    }

    player.animationState = nextAnimationState;
    player.direction = nextDirection;
    world.remove(playerId, AnimatedSprite);
    world.add(playerId, AnimatedSprite, createPlayerSprite(nextAnimationState, nextDirection, sprite));
  },
});
