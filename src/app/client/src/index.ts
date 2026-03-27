// apps/client/src/main.ts
import { PlayerComponent } from "@client/components/player";
import { createAppEngine } from "@client/create-app-engine";
import { bindAuthoritativeMultiplayer, multiplayerClientStatus } from "@client/networking/runtime";
import "@client/styles.css";
import { Camera, Transform2D } from "@engine/components";

declare global {
  interface Window {
    __BETTER_ECS_MAIN__?: {
      activeSceneName: () => string | null;
      playerPosition: () => { x: number; y: number } | null;
      cameraPosition: () => { x: number; y: number } | null;
      playerCount: () => number;
      cameraCount: () => number;
      playerScreenPosition: () => { x: number; y: number } | null;
      viewportCenter: () => { x: number; y: number };
      isCameraCentered: () => boolean;
      networkStatus: () => ReturnType<typeof multiplayerClientStatus>;
    };
  }
}

declare module "@engine" {
  interface Register {
    Engine: ReturnType<typeof createAppEngine>;
  }
}

async function main() {
  const engine = createAppEngine();

  bindAuthoritativeMultiplayer();
  window.__BETTER_ECS_MAIN__ = {
    activeSceneName: () => engine.scene.activeSceneName ?? null,
    playerPosition: () => readTransformPosition(engine.scene.context.getDefaultWorld(), PlayerComponent),
    cameraPosition: () => readTransformPosition(engine.scene.context.getDefaultWorld(), Camera),
    playerCount: () => engine.scene.context.getDefaultWorld().query(PlayerComponent, Transform2D).length,
    cameraCount: () => engine.scene.context.getDefaultWorld().query(Camera, Transform2D).length,
    playerScreenPosition: () => readPlayerScreenPosition(engine),
    viewportCenter: () => readViewportCenter(engine),
    isCameraCentered: () => isCameraCentered(engine.scene.context.getDefaultWorld()),
    networkStatus: () => multiplayerClientStatus(),
  };

  // Start application
  for await (const [update, frame] of engine.startEngine({ fps: 120, ups: 60 })) {
    if (update.shouldUpdate) {
      // Update phase - run update logic
    }

    if (frame.shouldUpdate) {
      // Render phase - run render logic
    }
  }
}

main();

function readTransformPosition(
  world: ReturnType<ReturnType<typeof createAppEngine>["scene"]["context"]["getDefaultWorld"]>,
  component: typeof PlayerComponent | typeof Camera,
): { x: number; y: number } | null {
  const [entityId] = world.query(component, Transform2D);

  if (entityId === undefined) {
    return null;
  }

  const transform = world.require(entityId, Transform2D);

  return {
    x: transform.curr.pos.x,
    y: transform.curr.pos.y,
  };
}

function isCameraCentered(
  world: ReturnType<ReturnType<typeof createAppEngine>["scene"]["context"]["getDefaultWorld"]>,
): boolean {
  const playerPosition = readTransformPosition(world, PlayerComponent);
  const cameraPosition = readTransformPosition(world, Camera);

  if (!playerPosition || !cameraPosition) {
    return false;
  }

  return playerPosition.x === cameraPosition.x && playerPosition.y === cameraPosition.y;
}

function readPlayerScreenPosition(engine: ReturnType<typeof createAppEngine>): { x: number; y: number } | null {
  const world = engine.scene.context.getDefaultWorld();
  const playerPosition = readTransformPosition(world, PlayerComponent);

  if (!playerPosition) {
    return null;
  }

  const camera = engine.utils.activeCameraView(world);
  const viewport = engine.canvas.getBoundingClientRect();

  return {
    x: (playerPosition.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (playerPosition.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

function readViewportCenter(engine: ReturnType<typeof createAppEngine>): { x: number; y: number } {
  const viewport = engine.canvas.getBoundingClientRect();

  return {
    x: viewport.width / 2,
    y: viewport.height / 2,
  };
}
