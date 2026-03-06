import { AnimatedSprite, Sprite } from "@engine/components";
import { getFrameAssetIdAtTime } from "@engine/components/sprite/animated";
import { fromContext, FromRender } from "@engine/context";
import { SpriteRenderRecordCache } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/cache";
import { QueueSpriteEntityManager } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/manager";
import { resolveCullingSignature } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/utility";
import {
  CullingBounds
} from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import type { SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function queueSprites(): void {
  // Get necessary context values
  const world = fromContext(FromRender.World);
  const queue = fromContext(FromRender.Queue);
  const interpolationAlpha = fromContext(FromRender.InterpolationAlpha);
  const cullingBounds = fromContext(CullingBounds);
  const frameAllocator = fromContext(FromRender.FrameAllocator);

  // Get sprite render record cache and queue manager instances
  const spriteRecords = frameAllocator.scratch<SpriteRenderRecord>("engine:sprite-render-records");
  const cache = SpriteRenderRecordCache.instance();

  // Begin frame: mark all records as unused by incrementing the serial
  cache.beginFrame();
  const cacheState = cache.resolveWorldState(world);
  const sampledTimeMs = performance.now();
  const cullingSignature = resolveCullingSignature(cullingBounds, interpolationAlpha);

  const manager = QueueSpriteEntityManager.instance(
    cache,
    cacheState,
    world, 
    interpolationAlpha, 
    cullingSignature,
    cullingBounds, 
    queue, 
    frameAllocator, 
    spriteRecords
  );

  // Queue sprite commands for all entities with Sprite or AnimatedSprite components
  world.forEach(Sprite, (entityId, sprite) => {
    manager.queue(entityId, sprite, sprite.assetId, false);
  });

  // AnimatedSprite is a separate loop to ensure it gets processed after Sprite, allowing it to override Sprite records if both components are present
  world.forEach(AnimatedSprite, (entityId, animatedSprite) => {
    if (world.has(entityId, Sprite)) {
      return;
    }

    manager.queue(entityId, animatedSprite, getFrameAssetIdAtTime(animatedSprite, sampledTimeMs), true);
  });

  // Prune unused sprite records from the cache
  cache.pruneBatchFromState(cacheState);
}


