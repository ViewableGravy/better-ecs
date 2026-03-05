import { AnimatedSprite, Sprite } from "@engine/components";
import { fromContext, FromRender } from "@engine/context";
import { SpriteRenderRecordCache } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/cache";
import { QueueSpriteEntityManager } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/manager";
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
  const manager = QueueSpriteEntityManager.instance(
    world, 
    interpolationAlpha, 
    cullingBounds, 
    queue, 
    frameAllocator, 
    spriteRecords
  );

  // Begin frame: mark all records as unused by incrementing the serial
  cache.beginFrame();

  // Queue sprite commands for all entities with Sprite or AnimatedSprite components
  world.forEach(Sprite, (entityId, sprite) => {
    manager.queue(entityId, sprite);
  });

  // AnimatedSprite is a separate loop to ensure it gets processed after Sprite, allowing it to override Sprite records if both components are present
  world.forEach(AnimatedSprite, (entityId, animatedSprite) => {
    if (world.has(entityId, Sprite)) {
      return;
    }

    manager.queue(entityId, animatedSprite);
  });

  // Prune unused sprite records from the cache
  cache.pruneBatch(world);
}
