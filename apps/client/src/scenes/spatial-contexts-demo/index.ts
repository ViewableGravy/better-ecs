import { PlayerComponent } from "@/components/player";
import { spawnCamera } from "@/entities/camera";
import { ensurePlayer } from "@/entities/player";
import { Color, Transform2D } from "@repo/engine/components";
import {
  createContextScene,
  createPortalSystem,
  defineContext,
  type PortalActivationArgs,
} from "@repo/plugins";
import { CircleCollider } from "./components/circle-collider";
import { DUNGEON, HOUSE, HOUSE_HALF_HEIGHT, HOUSE_HALF_WIDTH, OVERWORLD } from "./constants";
import { spawnBackground } from "./factories/spawnBackground";
import { spawnChair } from "./factories/spawnChair";
import { spawnDoor } from "./factories/spawnDoor";
import { spawnDungeon } from "./factories/spawnDungeon";
import { spawnHouse } from "./factories/spawnHouse";
import { spawnTable } from "./factories/spawnTable";
import { spawnTree } from "./factories/spawnTree";
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
  name: "client:spatial-contexts-portals",
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
  contexts: {
    focusedContextId: OVERWORLD,
    preloadContextIds: [HOUSE, DUNGEON],
    definitions: [
      defineContext({
        id: OVERWORLD,
        policy: {
          visibility: "stack",
          simulation: "focused-only",
        },
        setup(world) {
          spawnCamera(world);
          const playerId = ensurePlayer(world);
          if (!world.get(playerId, CircleCollider)) {
            world.add(playerId, new CircleCollider(16));
          }
          const playerTransform = world.get(playerId, Transform2D);
          if (playerTransform) {
            playerTransform.curr.pos.set(-320, 0);
            playerTransform.prev.pos.set(-320, 0);
          }

          spawnBackground(world, {
            width: 1200,
            height: 800,
            color: new Color(0.15, 0.2, 0.25, 1),
            role: "outside",
          });

          spawnHouse(world, {
            x: 0,
            y: 0,
            width: HOUSE_HALF_WIDTH * 2,
            height: HOUSE_HALF_HEIGHT * 2,
          });

          spawnTree(world, { x: -260, y: -140 });
          spawnTree(world, { x: -340, y: 90 });
          spawnTree(world, { x: -190, y: 190 });
          spawnTree(world, { x: 320, y: -130 });
          spawnTree(world, { x: 260, y: 170 });
          spawnTree(world, { x: 120, y: 250 });
          spawnTree(world, { x: -40, y: -270 });

          spawnDoor(world, {
            x: 0,
            y: -220,
            fill: new Color(0.5, 0.65, 1, 1),
            role: "outside",
            portal: {
              mode: "teleport",
              targetContextId: DUNGEON,
              spawn: { x: 0, y: 160 },
              label: "Overworld -> Dungeon",
            },
          });
        },
      }),
      defineContext({
        id: HOUSE,
        parentId: OVERWORLD,
        policy: {
          visibility: "stack",
          simulation: "focused-only",
        },
        setup(world) {
          spawnCamera(world);
          const playerId = ensurePlayer(world);
          if (!world.get(playerId, CircleCollider)) {
            world.add(playerId, new CircleCollider(16));
          }
          const playerTransform = world.get(playerId, Transform2D);
          if (playerTransform) {
            playerTransform.curr.pos.set(0, 0);
            playerTransform.prev.pos.set(0, 0);
          }

          spawnBackground(world, {
            width: HOUSE_HALF_WIDTH * 2,
            height: HOUSE_HALF_HEIGHT * 2,
            color: new Color(0.4, 0.3, 0.2, 1),
            role: "house-interior",
          });

          spawnTable(world, { x: -60, y: -30, radius: 28 });
          spawnTable(world, { x: 120, y: 70, radius: 24 });
          spawnChair(world, { x: -120, y: -30 });
          spawnChair(world, { x: -10, y: -30 });
          spawnChair(world, { x: 120, y: 100 });
          spawnChair(world, { x: 140, y: 70 });

          spawnDoor(world, {
            x: 120,
            y: 0,
            fill: new Color(0.85, 0.85, 0.85, 1),
            role: "house-interior",
            portal: {
              mode: "teleport",
              targetContextId: DUNGEON,
              spawn: { x: 0, y: 160 },
              label: "House -> Dungeon",
            },
          });
        },
      }),
      defineContext({
        id: DUNGEON,
        parentId: OVERWORLD,
        policy: {
          visibility: "focused-only",
          simulation: "focused-only",
        },
        setup(world) {
          spawnCamera(world);
          const playerId = ensurePlayer(world);
          if (!world.get(playerId, CircleCollider)) {
            world.add(playerId, new CircleCollider(16));
          }
          const playerTransform = world.get(playerId, Transform2D);
          if (playerTransform) {
            playerTransform.curr.pos.set(0, 160);
            playerTransform.prev.pos.set(0, 160);
          }
          spawnDungeon(world);

          spawnDoor(world, {
            x: 50,
            y: 220,
            fill: new Color(0.95, 0.4, 0.35, 1),
            role: "house-interior",
            portal: {
              mode: "teleport",
              targetContextId: OVERWORLD,
              spawn: { x: 0, y: 40 },
              label: "Dungeon -> Overworld",
            },
          });
        },
      }),
    ],
  },

  setup() {
    // Scene setup is context-driven.
  },
});
