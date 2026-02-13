import { PlayerComponent } from "@/components/player";
import { ensurePlayer } from "@/entities/player";
import { Transform2D } from "@repo/engine/components";
import {
  createContextScene,
  createPortalSystem,
  type PortalActivationArgs,
} from "@repo/spatial-contexts";
import { DUNGEON, HOUSE, OVERWORLD } from "./constants";
import { defineDungeonContext } from "./contexts/define-dungeon-context";
import { defineHouseContext } from "./contexts/define-house-context";
import { defineOverworldContext } from "./contexts/define-overworld-context";
import { DebugOverlaySystem } from "./systems/debug-overlay.system";
import { HouseContextSystem } from "./systems/house-context.system";
import { HouseVisualsSystem } from "./systems/house-visuals.system";
import { SceneCollisionSystem } from "./systems/scene-collision.system";

const portalOccupancy = new Set<PortalActivationArgs["portalEntity"]>();

function shouldActivatePortal(args: PortalActivationArgs): boolean {
  const [playerId] = args.world.query(PlayerComponent);
  if (!playerId) return false;

  const playerTransform = args.world.get(playerId, Transform2D);
  if (!playerTransform) return false;

  const portalTransform = args.world.get(args.portalEntity, Transform2D);
  if (!portalTransform) return false;

  const dx = playerTransform.curr.pos.x - portalTransform.curr.pos.x;
  const dy = playerTransform.curr.pos.y - portalTransform.curr.pos.y;

  const inside = Math.abs(dx) <= 24 && Math.abs(dy) <= 48;
  const portalKey = args.portalEntity;
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
  contexts: [defineOverworldContext(), defineHouseContext(), defineDungeonContext()],
  setup(_world, manager) {
    manager.ensureWorldLoaded(HOUSE);
    manager.ensureWorldLoaded(DUNGEON);
    manager.setFocusedContextId(OVERWORLD);
  },
});
