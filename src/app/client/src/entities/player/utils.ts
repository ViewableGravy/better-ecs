import { getPlayerEntityId } from "@client/entities/player/actions";
import type { UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import invariant from "tiny-invariant";

/**
 * Set of utils for work with the player entity. Many actions
 * relating to accessing the player entity are common and involve assertions that cannot
 * be broken, so this class serves as a single source of truth for those actions.
 */
export class PlayerUtils {
  public static getTransform(world: UserWorld) {
    const playerId = getPlayerEntityId(world);
    invariant(playerId, "Player entity not found in world.");

    const transform = world.get(playerId, Transform2D);
    invariant(transform, "Player transform not found in world.");

    return transform;
  }
}