import {
  AnimatedSprite,
  EditorHoverHighlight,
  Parent,
  Sprite,
  Transform2D,
  WorldTransform2D,
} from "@engine/components";
import { SpritePipe } from "@engine/core/render-pipeline/passes/render-world/retained-sprites/sprite-pipe";
import type { EntityId } from "@engine/ecs/entity";
import { UserWorld, World } from "@engine/ecs/world";
import {
  DEFAULT_RENDERER_CONFIG,
  RenderQueue,
  TextureCache,
  type Renderer,
} from "@engine/render";
import { syncWorldTransform2D } from "@engine/systems/worldTransform2D";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("SpritePipe", () => {
  let renderer: TestRenderer;
  let registry: SpritePipe;
  let world: UserWorld;
  let entityId: EntityId;
  let sprite: Sprite;
  let worldTransform: WorldTransform2D;

  beforeEach(() => {
    renderer = createTestRenderer();
    registry = new SpritePipe(renderer);
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

  it("does not re-upsert an unchanged non-animated retained population on later frames", () => {
    for (let index = 0; index < 4; index += 1) {
      const additionalEntityId = world.create();
      world.add(additionalEntityId, new Sprite("test", 16, 8));
      world.add(additionalEntityId, new WorldTransform2D(index + 1, 0));
    }

    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    expect(renderer.upsertRetainedSprite).toHaveBeenCalledTimes(5);
    renderer.upsertRetainedSprite.mockClear();

    registry.syncAndQueue(world, new RenderQueue(), 16, 1);
    registry.syncAndQueue(world, new RenderQueue(), 32, 2);

    expect(renderer.upsertRetainedSprite).not.toHaveBeenCalled();
  });

  it("updates an animated sprite only when its sampled asset changes", () => {
    world.remove(entityId, Sprite);
    world.add(entityId, new AnimatedSprite({
      assets: ["frame-a", "frame-b"],
      playbackMode: "tick",
      playbackRate: 1,
      startTick: 0,
    }));

    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite.mock.calls[0]?.[2].assetId).toBe("frame-a");
    renderer.upsertRetainedSprite.mockClear();

    registry.syncAndQueue(world, new RenderQueue(), 16, 0);
    expect(renderer.upsertRetainedSprite).not.toHaveBeenCalled();

    registry.syncAndQueue(world, new RenderQueue(), 32, 1);
    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite.mock.calls[0]?.[2].assetId).toBe("frame-b");
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

  it("migrates a sprite to a different retained bucket when its dynamic partition changes", () => {
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    renderer.upsertRetainedSprite.mockClear();

    sprite.isDynamic = false;
    const queue = new RenderQueue();
    registry.syncAndQueue(world, queue, 1, 1);

    expect(renderer.removeRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.removeRetainedSprite).toHaveBeenCalledWith(1, entityId);
    expect(renderer.releaseRetainedSpriteBucket).toHaveBeenCalledOnce();
    expect(renderer.releaseRetainedSpriteBucket).toHaveBeenCalledWith(1);
    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite).toHaveBeenCalledWith(
      2,
      entityId,
      expect.objectContaining({ assetId: "test" }),
      worldTransform,
    );
    expect(queue.commands).toHaveLength(1);
    expect(queue.commands[0]?.retainedSpriteBucketId).toBe(2);
  });

  it("upserts once after a published WorldTransform2D mutation", () => {
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    renderer.upsertRetainedSprite.mockClear();

    worldTransform.curr.pos.x = 24;
    world.notifyEntityChanged(entityId);
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
    expect(renderer.removeRetainedSprite).toHaveBeenCalledWith(1, entityId);
    expect(renderer.releaseRetainedSpriteBucket).toHaveBeenCalledOnce();
    expect(renderer.releaseRetainedSpriteBucket).toHaveBeenCalledWith(1);
    expect(queue.commands).toHaveLength(0);
  });

  it("retains direct Parent mutation through the derived world-transform update", () => {
    const firstRoot = world.create();
    const secondRoot = world.create();
    world.add(firstRoot, new Transform2D(10, 0));
    world.add(secondRoot, new Transform2D(50, 0));
    world.add(entityId, new Transform2D(2, 0));
    world.add(entityId, new Parent(firstRoot));
    syncWorldTransform2D(world);
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    renderer.upsertRetainedSprite.mockClear();

    world.require(entityId, Parent).entityId = secondRoot;
    syncWorldTransform2D(world);
    registry.syncAndQueue(world, new RenderQueue(), 1, 1);

    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite.mock.calls[0]?.[3].curr.pos.x).toBe(52);

    renderer.upsertRetainedSprite.mockClear();
    registry.syncAndQueue(world, new RenderQueue(), 2, 2);
    expect(renderer.upsertRetainedSprite).not.toHaveBeenCalled();
  });

  it("updates retained tint when hover state is structurally added and removed", () => {
    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    renderer.upsertRetainedSprite.mockClear();

    world.add(entityId, new EditorHoverHighlight(0.5));
    registry.syncAndQueue(world, new RenderQueue(), 1, 1);

    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite.mock.calls[0]?.[2].tint).toMatchObject({
      r: 1,
      g: 1,
      b: 0.5,
      a: 1,
    });

    renderer.upsertRetainedSprite.mockClear();
    world.remove(entityId, EditorHoverHighlight);
    registry.syncAndQueue(world, new RenderQueue(), 2, 2);

    expect(renderer.upsertRetainedSprite).toHaveBeenCalledOnce();
    expect(renderer.upsertRetainedSprite.mock.calls[0]?.[2].tint).toMatchObject({
      r: 1,
      g: 1,
      b: 1,
      a: 1,
    });
  });

  it("keeps scene-scoped EntityIds isolated through distinct world buckets", () => {
    const secondWorld = new UserWorld(new World("second-scene"));
    const secondEntityId = secondWorld.create();
    secondWorld.add(secondEntityId, new Sprite("test", 16, 8));
    secondWorld.add(secondEntityId, new WorldTransform2D());

    registry.syncAndQueue(world, new RenderQueue(), 0, 0);
    registry.syncAndQueue(secondWorld, new RenderQueue(), 0, 0);

    expect(entityId).toBe(secondEntityId);
    expect(renderer.upsertRetainedSprite).toHaveBeenNthCalledWith(
      1,
      1,
      entityId,
      expect.any(Object),
      worldTransform,
    );
    expect(renderer.upsertRetainedSprite).toHaveBeenNthCalledWith(
      2,
      2,
      secondEntityId,
      expect.any(Object),
      expect.any(WorldTransform2D),
    );

    world.remove(entityId, Sprite);
    registry.syncAndQueue(world, new RenderQueue(), 1, 1);
    const secondQueue = new RenderQueue();
    registry.syncAndQueue(secondWorld, secondQueue, 1, 1);

    expect(renderer.removeRetainedSprite).toHaveBeenCalledWith(1, entityId);
    expect(renderer.removeRetainedSprite).not.toHaveBeenCalledWith(2, secondEntityId);
    expect(secondQueue.commands[0]?.retainedSpriteBucketId).toBe(2);
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
