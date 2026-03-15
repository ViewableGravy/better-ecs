import {
    type PlayerAnimationState,
    PlayerComponent,
    type PlayerDirection,
} from "@client/components/player";
import { createPlayerSprite } from "@client/entities/player/render/createPlayerSprite";
import { createSystem, mutate } from "@engine";
import { AnimatedSprite, Transform2D } from "@engine/components";
import { System as ContextSystem, Delta, fromContext, World } from "@engine/context";

function isActive(keysActive: Set<string>, primaryCode: string, secondaryCode: string): boolean {
  return keysActive.has(primaryCode) || keysActive.has(secondaryCode);
}

function resolveMovementAxes(keysActive: Set<string>): { x: -1 | 0 | 1; y: -1 | 0 | 1 } {
  const x = (isActive(keysActive, "ArrowRight", "KeyD") ? 1 : 0)
    - (isActive(keysActive, "ArrowLeft", "KeyA") ? 1 : 0);
  const y = (isActive(keysActive, "ArrowDown", "KeyS") ? 1 : 0)
    - (isActive(keysActive, "ArrowUp", "KeyW") ? 1 : 0);

  return {
    x: x as -1 | 0 | 1,
    y: y as -1 | 0 | 1,
  };
}

function resolveDirectionFromAxes(x: -1 | 0 | 1, y: -1 | 0 | 1): PlayerDirection | undefined {
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

export const System = createSystem("movement")({
  system() {
    /***** CONTEXT *****/
    const world = fromContext(World);
    const { data } = fromContext(ContextSystem("engine:input"));
    const [updateDelta] = fromContext(Delta);

    /***** QUERIES *****/
    const [playerId] = world.invariantQuery(PlayerComponent);
    const player = world.require(playerId, PlayerComponent);
    const transform = world.require(playerId, Transform2D);

    let animatedSprite = world.get(playerId, AnimatedSprite);

    if (!animatedSprite) {
      animatedSprite = createPlayerSprite(player.animationState, player.direction);
      world.add(playerId, AnimatedSprite, animatedSprite);
    }

    const { x, y } = resolveMovementAxes(data.keysActive);
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
