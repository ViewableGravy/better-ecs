import {
    PLAYER_GROUNDED_HITBOX_RADIUS,
    ensurePlayer,
    spawnPlayer,
} from "@client/entities/player";
import { UserWorld, World } from "@engine";
import { Parent } from "@engine/components";
import { CircleCollider } from "@libs/physics";
import { describe, expect, it } from "vitest";

describe("Player grounded collider", () => {
  it("spawns the player with a single grounded circle collider", () => {
    const world = new UserWorld(new World("scene"));
    const playerEntityId = spawnPlayer(world);

    expect(world.require(playerEntityId, CircleCollider).radius).toBe(PLAYER_GROUNDED_HITBOX_RADIUS);
    expect([...world.query(Parent)]).toHaveLength(2);
  });

  it("ensurePlayer reuses the existing spawned player", () => {
    const world = new UserWorld(new World("scene"));
    const playerEntityId = spawnPlayer(world);
    const ensuredPlayerEntityId = ensurePlayer(world);

    expect(ensuredPlayerEntityId).toBe(playerEntityId);
    expect(world.require(ensuredPlayerEntityId, CircleCollider).radius).toBe(PLAYER_GROUNDED_HITBOX_RADIUS);
  });
});