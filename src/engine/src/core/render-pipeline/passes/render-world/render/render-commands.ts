import { Transform2D } from "@engine/components/transform";
import { fromContext, FromEngine, FromRender } from "@engine/context";
import { drawCullingBoundsOverlay } from "@engine/core/render-pipeline/passes/render-world/render/culling/overlay";
import {
  CullingBounds,
  isCommandWithinCullingBounds,
  isEntityRenderCommand,
  isShapeDrawRenderCommand,
  type EntityRenderCommand,
} from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import { handleShaderEntityCommand } from "@engine/core/render-pipeline/passes/render-world/render/handlers/shader-entity";
import { handleShapeDrawCommand } from "@engine/core/render-pipeline/passes/render-world/render/handlers/shape-draw";
import { handleShapeEntityCommand } from "@engine/core/render-pipeline/passes/render-world/render/handlers/shape-entity";
import { handleSpriteEntityCommand } from "@engine/core/render-pipeline/passes/render-world/render/handlers/sprite-entity";
import type { SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import { resolveWorldTransform2D } from "@engine/ecs/hierarchy";
import type { RenderQueue } from "@engine/render";

const SHARED_RENDER_TRANSFORM = new Transform2D();

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type RenderQueueBuckets = RenderQueue["buckets"];

type RenderQueueTraceSample = {
  frames: number;
  totalTraversalMs: number;
  averageTraversalMs: number;
  maxTraversalMs: number;
  lastTraversalMs: number;
  totalCommandCount: number;
  averageCommandCount: number;
  lastCommandCount: number;
};

type RenderQueueTraceWindow = Window & {
  __BETTER_ECS_TRACE_RENDER_QUEUE__?: boolean;
  __BETTER_ECS_TRACE_RENDER_QUEUE_SAMPLE__?: RenderQueueTraceSample;
};

type RenderQueueTraversalMeasurement = {
  durationMs: number;
  commandCount: number;
};

export function renderCommands(
): void {
  const queue: RenderQueue = fromContext(FromRender.Queue);
  const renderer = fromContext(FromRender.Renderer);
  const frameAllocator = fromContext(FromRender.FrameAllocator);
  const interpolationAlpha = fromContext(FromRender.InterpolationAlpha);
  const engine = fromContext(FromEngine.Engine);
  const activeRenderWorld = fromContext(FromRender.World);
  const visibleWorlds = fromContext(FromRender.VisibleWorlds);
  const cullingBounds = fromContext(CullingBounds);
  const traceWindow = resolveRenderQueueTraceWindow();
  const buckets = queue.buckets;
  const spriteRenderRecords = frameAllocator.scratch<SpriteRenderRecord>("engine:sprite-render-records");
  
  const isLastVisibleWorld = visibleWorlds.length === 0 || visibleWorlds[visibleWorlds.length - 1] === activeRenderWorld;
  const showQuadOutlines = engine.editor.viewState.showQuadOutlines;
  const showCullingBounds = engine.editor.viewState.showCullingBounds || engine.renderCulling.debugOutline;
  renderer.setMeshOverlayEnabled(showQuadOutlines);

  for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
    const bucket = buckets[bucketIndex];
    if (!bucket) {
      continue;
    }

    const commands = bucket.commands;
    for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
      const command = commands[commandIndex];
      if (!command) {
        continue;
      }

      /***** RAW DRAW COMMANDS *****/
      if (isShapeDrawRenderCommand(command)) {
        if (!isCommandWithinCullingBounds(command, cullingBounds)) {
          continue;
        }

        handleShapeDrawCommand(command);
        continue;
      }

      /***** ECS RENDER COMMANDS *****/
      if (!isEntityRenderCommand(command))
        continue;

      const { world, entityId } = command;
      const spriteRecord = resolveSpriteRecord(command, spriteRenderRecords);

      if (command.type === "sprite-entity" && spriteRecord) {
        handleSpriteEntityCommand(command, spriteRecord.worldTransform, renderer, interpolationAlpha, spriteRecord);
        continue;
      }

      const didResolveTransform = resolveCommandWorldTransform(command, world, entityId, SHARED_RENDER_TRANSFORM, spriteRecord);
      if (!didResolveTransform) {
        continue;
      }

      const commandTransform = resolveCommandTransformRef(command, SHARED_RENDER_TRANSFORM, spriteRecord);

      if (!isCommandWithinCullingBounds(command, cullingBounds, commandTransform, interpolationAlpha, spriteRecord))
        continue;

      if (command.type === "shader-entity") {
        handleShaderEntityCommand(command, commandTransform);
        continue;
      }

      if (command.type === "shape-entity") {
        handleShapeEntityCommand(command, commandTransform);
        continue;
      }

      console.warn(`[Render Commands] Unhandled render command type: ${command.type}`);
    }
  }



  if (isLastVisibleWorld && showCullingBounds && cullingBounds) {
    drawCullingBoundsOverlay(renderer, cullingBounds);
  }

  if (traceWindow?.__BETTER_ECS_TRACE_RENDER_QUEUE__) {
    const traversalMeasurement = measureBucketTraversal(buckets);
    recordRenderQueueTraceSample(traceWindow, traversalMeasurement);
  }
}

function resolveSpriteRecord(
  command: EntityRenderCommand,
  records: SpriteRenderRecord[],
): SpriteRenderRecord | null {
  if (command.type !== "sprite-entity") {
    return null;
  }

  const index = command.spriteRecordIndex;
  if (index === undefined) {
    return null;
  }

  return records[index] ?? null;
}

function resolveCommandWorldTransform(
  command: EntityRenderCommand,
  world: EntityRenderCommand["world"],
  entityId: EntityRenderCommand["entityId"],
  out: Transform2D,
  spriteRecord: SpriteRenderRecord | null,
): boolean {
  if (command.type === "sprite-entity" && spriteRecord) {
    return true;
  }

  return resolveWorldTransform2D(world, entityId, out);
}

function resolveCommandTransformRef(
  command: EntityRenderCommand,
  fallback: Transform2D,
  spriteRecord: SpriteRenderRecord | null,
): Transform2D {
  if (command.type === "sprite-entity" && spriteRecord) {
    return spriteRecord.worldTransform;
  }

  return fallback;
}

function resolveRenderQueueTraceWindow(): RenderQueueTraceWindow | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

function measureBucketTraversal(
  buckets: RenderQueueBuckets,
): RenderQueueTraversalMeasurement {
  const start = performance.now();
  let commandCount = 0;

  for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
    const bucket = buckets[bucketIndex];
    if (!bucket) {
      continue;
    }

    const commands = bucket.commands;
    for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
      const command = commands[commandIndex];
      if (!command) {
        continue;
      }

      commandCount += 1;
    }
  }

  return {
    durationMs: performance.now() - start,
    commandCount,
  };
}

function recordRenderQueueTraceSample(
  traceWindow: RenderQueueTraceWindow,
  measurement: RenderQueueTraversalMeasurement,
): void {
  const existing = traceWindow.__BETTER_ECS_TRACE_RENDER_QUEUE_SAMPLE__;
  if (!existing) {
    traceWindow.__BETTER_ECS_TRACE_RENDER_QUEUE_SAMPLE__ = {
      frames: 1,
      totalTraversalMs: measurement.durationMs,
      averageTraversalMs: measurement.durationMs,
      maxTraversalMs: measurement.durationMs,
      lastTraversalMs: measurement.durationMs,
      totalCommandCount: measurement.commandCount,
      averageCommandCount: measurement.commandCount,
      lastCommandCount: measurement.commandCount,
    };
    return;
  }

  existing.frames += 1;
  existing.totalTraversalMs += measurement.durationMs;
  existing.averageTraversalMs = existing.totalTraversalMs / existing.frames;
  existing.maxTraversalMs = Math.max(existing.maxTraversalMs, measurement.durationMs);
  existing.lastTraversalMs = measurement.durationMs;
  existing.totalCommandCount += measurement.commandCount;
  existing.averageCommandCount = existing.totalCommandCount / existing.frames;
  existing.lastCommandCount = measurement.commandCount;
}

