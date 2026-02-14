import { PlayerComponent } from "@/components/player";
import { ensurePlayer } from "@/entities/player";
import { Transform2D } from "@repo/engine/components";
import { collides, getEntityCollider } from "@repo/physics";
import {
  contextId,
  createContextScene,
  createPortalSystem,
  type PortalActivationArgs,
} from "@repo/spatial-contexts";
import { defineDungeonContext } from "./contexts/define-dungeon-context";
import { defineHouseContext } from "./contexts/define-house-context";
import { defineOverworldContext } from "./contexts/define-overworld-context";
import { DebugOverlaySystem } from "./systems/debug-overlay.system";
import { HouseContextSystem } from "./systems/house-context.system";
import { HouseVisualsSystem } from "./systems/house-visuals.system";
import { SceneCollisionSystem } from "./systems/scene-collision.system";

const sceneConfig = {
  contextIds: {
    overworld: contextId("default"),
    house: contextId("house_1"),
    dungeon: contextId("dungeon_1"),
  },
  house: {
    halfWidth: 160,
    halfHeight: 120,
  },
};

const portalOccupancy = new Set<string>();

function shouldActivatePortal(args: PortalActivationArgs): boolean {
  const [playerId] = args.world.query(PlayerComponent);
  if (!playerId) return false;

  const playerTransform = args.world.get(playerId, Transform2D);
  if (!playerTransform) return false;

  const portalTransform = args.world.get(args.portalEntity, Transform2D);
  if (!portalTransform) return false;

  const playerCollider = getEntityCollider(args.world, playerId);
  if (!playerCollider) return false;

  const portalCollider = getEntityCollider(args.world, args.portalEntity);
  if (!portalCollider) return false;

  const inside = collides(playerCollider, playerTransform, portalCollider, portalTransform);

  const portalKey = `${args.focusedContextId}:${args.portalEntity}`;
  const wasInside = portalOccupancy.has(portalKey);

  if (inside) {
    portalOccupancy.add(portalKey);
  } else {
    portalOccupancy.delete(portalKey);
  }

  return inside && !wasInside;
}

const PortalsSystem = createPortalSystem({
  name: "demo:spatial-contexts-portals",
  shouldActivate: shouldActivatePortal,
  onEnter({ nextWorld }) {
    ensurePlayer(nextWorld);
  },
  onTeleport({ portal, nextWorld }) {
    if (!portal.spawn) return;

    const playerId = ensurePlayer(nextWorld);
    const transform = nextWorld.get(playerId, Transform2D);
    if (!transform) return;

    transform.curr.pos.set(portal.spawn.x, portal.spawn.y);
    transform.prev.pos.set(portal.spawn.x, portal.spawn.y);
  },
});

export const Scene = createContextScene("SpatialContextsDemo")({
  systems: [
    SceneCollisionSystem,
    HouseContextSystem,
    PortalsSystem,
    HouseVisualsSystem,
    DebugOverlaySystem,
  ],
  contexts: [
    defineOverworldContext({
      overworldId: sceneConfig.contextIds.overworld,
      houseId: sceneConfig.contextIds.house,
      dungeonId: sceneConfig.contextIds.dungeon,
      houseHalfWidth: sceneConfig.house.halfWidth,
      houseHalfHeight: sceneConfig.house.halfHeight,
    }),
    defineHouseContext({
      overworldId: sceneConfig.contextIds.overworld,
      houseId: sceneConfig.contextIds.house,
      dungeonId: sceneConfig.contextIds.dungeon,
      houseHalfWidth: sceneConfig.house.halfWidth,
      houseHalfHeight: sceneConfig.house.halfHeight,
    }),
    defineDungeonContext({
      overworldId: sceneConfig.contextIds.overworld,
      dungeonId: sceneConfig.contextIds.dungeon,
    }),
  ],
  setup(_world, manager) {
    manager.ensureWorldLoaded(sceneConfig.contextIds.house);
    manager.ensureWorldLoaded(sceneConfig.contextIds.dungeon);
    manager.setFocusedContextId(sceneConfig.contextIds.overworld);
  },
});
