import { Sprite, WorldTransform2D } from "@engine/components";
import { RetainedEcsSpriteRegistry } from "@engine/core/render-pipeline/passes/render-world/retained-sprites/registry";
import type { EntityId } from "@engine/ecs/entity";
import { UserWorld, World } from "@engine/ecs/world";
import {
  DEFAULT_RENDERER_CONFIG,
  RenderQueue,
  TextureCache,
  type Renderer,
} from "@engine/render";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("RetainedEcsSpriteRegistry", () => {
  let renderer: TestRenderer;
  let registry: RetainedEcsSpriteRegistry;
  let world: UserWorld;
  let entityId: EntityId;
  let sprite: Sprite;
  let worldTransform: WorldTransform2D;

  beforeEach(() => {
    renderer = createTestRenderer();
    registry = new RetainedEcsSpriteRegistry(renderer);
    world = new UserWorld(new World("scene"));
    entityId = world.create();
    sprite = new Sprite("test", 16, 8);
    worldTransform = new WorldTransform2D();
    world.add(entityId, sprite);
    world.add(entityId, worldTransform);
  });

  it("registers an initial Sprite and WorldTransform2D and queues one retained bucket", () => {
    const queue = new RenderQueue();

    registry.syncAndQueue(world, queue, 0, 0);

    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(queue.commands).toHaveLength(1);
    expect(queue.commands[0]?.type).toBe("retained-sprite-bucket");
    expect(queue.commands[0]?.retainedSpriteBucketId).toBe(1);
  });

  it("does not upsert an unchanged sprite during a later sync", () => {
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    renderer.upsertRetainedSprite.mockClear();
    const queue = new RenderQueue();

    registry.syncAndQueue(world, queue, 1, 1);

    expect(renderer.upsertRetainedSprite).not.toHaveBeenCalled();
    expect(queue.commands.map((command) => command.type)).toEqual(["retained-sprite-bucket"]);
  });

  it("upserts once after a direct Sprite field mutation", () => {
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    renderer.upsertRetainedSprite.mockClear();

    sprite.width = 32;
    registry.syncAndQueue(world, new RenderQueue(), 1, 1);

    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite).toHaveBeenCalledWith(
      expect.any(Number),
      entityId,
      expect.objectContaining({ width: 32 }),
      worldTransform,
    );
  });

  it("upserts once after a published WorldTransform2D mutation", () => {
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    renderer.upsertRetainedSprite.mockClear();

    worldTransform.curr.pos.x = 24;
    world.notifyComponentChanged(entityId, worldTransform);
    registry.syncAndQueue(world, new RenderQueue(), 1, 1);

    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite).toHaveBeenCalledWith(
      expect.any(Number),
      entityId,
      expect.any(Object),
      expect.objectContaining({
        curr: expect.objectContaining({
          pos: expect.objectContaining({ x: 24 }),
        }),
      }),
    );
  });

  it("removes the instance and releases its empty bucket when Sprite is removed", () => {
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    world.remove(entityId, Sprite);
    const queue = new RenderQueue();
    registry.syncAndQueue(world, queue, 1, 1);

    expect(renderer.removeRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.releaseRetainedSpriteBucket).toHaveBeenCalledOnce();
    expect(queue.commands).toHaveLength(0);
  });

  it("preserves manually queued commands alongside retained ECS buckets", () => {
    const queue = new RenderQueue();
    queue.add({
      type: "shape-draw",
      world: null,
      entityId: null,
      shape: null,
      scope: "gameplay",
      bucketKind: "shape",
      bucketKey: "manual-shape",
      layer: 0,
      zOrder: 0,
      sequence: 0,
    });

    registry.syncAndQueue(world, queue, 0, 0);

    expect(queue.commands.map((command) => command.type)).toEqual([
      "retained-sprite-bucket",
      "shape-draw",
    ]);
  });
});

type TestRenderer = ReturnType<typeof createTestRenderer>;

function createTestRenderer() {
  return {
    cache: new TextureCache(DEFAULT_RENDERER_CONFIG),
    config: DEFAULT_RENDERER_CONFIG,
    initialize: async () => undefined,
    warmupLoadedTextures: async () => undefined,
    begin: () => undefined,
    end: () => undefined,
    clear: () => undefined,
    render: () => undefined,
    renderSprite: () => undefined,
    upsertRetainedSprite: vi.fn<Renderer["upsertRetainedSprite"]>(() => true),
    removeRetainedSprite: vi.fn(),
    drawRetainedSpriteBucket: () => undefined,
    releaseRetainedSpriteBucket: vi.fn(),
    set: () => undefined,
    drawShape: () => undefined,
    drawTexturedQuad: () => undefined,
    drawShaderQuad: () => undefined,
    setCamera: () => undefined,
    setMeshOverlayEnabled: () => undefined,
    getCameraX: () => 0,
    getCameraY: () => 0,
    getCameraZoom: () => 1,
    getWidth: () => 1280,
    getHeight: () => 720,
  } satisfies Renderer;
}
