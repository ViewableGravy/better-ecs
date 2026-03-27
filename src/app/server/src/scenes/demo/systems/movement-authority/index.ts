import type { EntityId, UserWorld } from "@engine";
import { createSystem, mutate } from "@engine";
import { AnimatedSprite, Transform2D } from "@engine/components";
import { System as ContextSystem, Delta, fromContext, World } from "@engine/context";
import { type MovementAxis, type MovementCommand } from "@libs/commands/movement";
import { type PlayerAnimationState, PlayerComponent } from "@server/scenes/demo/components/PlayerComponent";
import {
    createPlayerSprite,
    resolvePlayerSpriteDepthSortY,
    resolvePlayerSpriteZOrder,
} from "@server/scenes/demo/entities/player/createPlayerSprite";
import { PLAYER_GROUNDED_HITBOX_RADIUS } from "@server/scenes/demo/entities/player/spawnPlayer";
import { MOVEMENT_COMMAND_SYSTEM_NAME } from "@server/scenes/demo/systems/movement-command";

type MovementAxes = {
  x: MovementAxis;
  y: MovementAxis;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:player-movement-authority")({
  system() {
    const world = fromContext(World);
    const { data: commandData } = fromContext(ContextSystem(MOVEMENT_COMMAND_SYSTEM_NAME));
    const [updateDelta] = fromContext(Delta);

    const [playerId] = world.invariantQuery(PlayerComponent);
    const player = world.require(playerId, PlayerComponent);
    const transform = world.require(playerId, Transform2D);
    const animatedSprite = ensurePlayerSprite(world, playerId, player.animationState, player.direction);
    const { x, y } = resolveMovementAxesFromCommands(commandData.commands);
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

function ensurePlayerSprite(
  world: UserWorld,
  playerId: EntityId<PlayerComponent>,
  animationState: PlayerAnimationState,
  direction: PlayerComponent["direction"],
): AnimatedSprite {
  const sprite = world.get(playerId, AnimatedSprite);

  if (sprite) {
    return sprite;
  }

  const nextSprite = createPlayerSprite(animationState, direction);
  world.add(playerId, AnimatedSprite, nextSprite);
  return world.require(playerId, AnimatedSprite);
}

function resolveDirectionFromAxes(x: MovementAxis, y: MovementAxis): PlayerComponent["direction"] | undefined {
  if (x === 0 && y === -1) return "n";
  if (x === 1 && y === -1) return "ne";
  if (x === 1 && y === 0) return "e";
  if (x === 1 && y === 1) return "se";
  if (x === 0 && y === 1) return "s";
  if (x === -1 && y === 1) return "sw";
  if (x === -1 && y === 0) return "w";
  if (x === -1 && y === -1) return "nw";

  return undefined;
}

function resolveMovementAxesFromCommands(commands: readonly MovementCommand[]): MovementAxes {
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index];

    if (command.type !== "movement:move") {
      continue;
    }

    return {
      x: command.x,
      y: command.y,
    };
  }

  return {
    x: 0,
    y: 0,
  };
}