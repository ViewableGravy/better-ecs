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
import { getWorldTransform2D, resolveWorldTransform2D } from "@engine/ecs/hierarchy";

const SHARED_RENDER_TRANSFORM = new Transform2D();

/** Dispatch queued world-render commands in bucket order. */
export function renderCommands(): void {
  const queue = fromContext(FromRender.Queue);
  const renderer = fromContext(FromRender.Renderer);
  const interpolationAlpha = fromContext(FromRender.InterpolationAlpha);
  const engine = fromContext(FromEngine.Engine);
  const cullingBounds = fromContext(CullingBounds);

  renderer.setMeshOverlayEnabled(engine.editor.viewState.showQuadOutlines);

  for (const bucket of queue.buckets) {
    for (const command of bucket.commands) {
      if (command.type === "retained-sprite-bucket") {
        if (command.retainedSpriteBucketId !== undefined) {
          renderer.drawRetainedSpriteBucket(
            command.retainedSpriteBucketId,
            interpolationAlpha,
            engine.meta.updateTick,
          );
        }
        continue;
      }

      if (isShapeDrawRenderCommand(command)) {
        if (isCommandWithinCullingBounds(command, cullingBounds)) {
          handleShapeDrawCommand(command);
        }
        continue;
      }

      if (!isEntityRenderCommand(command)
        || !resolveCommandWorldTransform(command, SHARED_RENDER_TRANSFORM)
        || !isCommandWithinCullingBounds(command, cullingBounds, SHARED_RENDER_TRANSFORM, interpolationAlpha)) {
        continue;
      }

      if (command.type === "shader-entity") {
        handleShaderEntityCommand(command, SHARED_RENDER_TRANSFORM);
        continue;
      }

      handleShapeEntityCommand(command, SHARED_RENDER_TRANSFORM);
    }
  }

  const showCullingBounds = engine.editor.viewState.showCullingBounds || engine.renderCulling.debugOutline;
  if (showCullingBounds && cullingBounds) {
    drawCullingBoundsOverlay(renderer, cullingBounds);
  }
}

function resolveCommandWorldTransform(command: EntityRenderCommand, out: Transform2D): boolean {
  const worldTransform = getWorldTransform2D(command.registry, command.entityId);
  if (worldTransform) {
    out.curr.copyFrom(worldTransform.curr);
    out.prev.copyFrom(worldTransform.prev);
    return true;
  }

  return resolveWorldTransform2D(command.registry, command.entityId, out);
}
