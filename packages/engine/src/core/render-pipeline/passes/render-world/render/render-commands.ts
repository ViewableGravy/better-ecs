import { Transform2D } from "@components/transform";
import { fromContext, FromEngine, FromRender } from "@context";
import { drawCullingBoundsOverlay } from "@core/render-pipeline/passes/render-world/render/culling/overlay";
import {
  CullingBounds,
  isCommandWithinCullingBounds,
  isEntityRenderCommand,
  isShapeDrawRenderCommand,
} from "@core/render-pipeline/passes/render-world/render/culling/utils";
import { handleShaderEntityCommand } from "@core/render-pipeline/passes/render-world/render/handlers/shader-entity";
import { handleShapeDrawCommand } from "@core/render-pipeline/passes/render-world/render/handlers/shape-draw";
import { handleShapeEntityCommand } from "@core/render-pipeline/passes/render-world/render/handlers/shape-entity";
import { handleSpriteEntityCommand } from "@core/render-pipeline/passes/render-world/render/handlers/sprite-entity";
import { resolveWorldTransform2D } from "@ecs/hierarchy";
import type { RenderQueue } from "@render";

const SHARED_RENDER_TRANSFORM = new Transform2D();

export function renderCommands(
): void {
  const queue: RenderQueue = fromContext(FromRender.Queue);
  const renderer = fromContext(FromRender.Renderer);
  const interpolationAlpha = fromContext(FromRender.InterpolationAlpha);
  const engine = fromContext(FromEngine.Engine);
  const activeRenderWorld = fromContext(FromRender.World);
  const visibleWorlds = fromContext(FromRender.VisibleWorlds);
  const cullingBounds = fromContext(CullingBounds);
  
  const isLastVisibleWorld = visibleWorlds.length === 0 || visibleWorlds[visibleWorlds.length - 1] === activeRenderWorld;
  const showQuadOutlines = engine.editor.viewState.showQuadOutlines;
  const showCullingBounds = engine.editor.viewState.showCullingBounds || engine.renderCulling.debugOutline;

  renderer.setMeshOverlayEnabled(showQuadOutlines);


  
  for (const command of queue.commands) {
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

    if (!resolveWorldTransform2D(world, entityId, SHARED_RENDER_TRANSFORM))
      continue;

    if (!isCommandWithinCullingBounds(command, cullingBounds, SHARED_RENDER_TRANSFORM, interpolationAlpha))
      continue;

    if (command.type === "sprite-entity") {
      handleSpriteEntityCommand(command, SHARED_RENDER_TRANSFORM);
      continue;
    }

    if (command.type === "shader-entity") {
      handleShaderEntityCommand(command, SHARED_RENDER_TRANSFORM);
      continue;
    }

    if (command.type === "shape-entity") {
      handleShapeEntityCommand(command, SHARED_RENDER_TRANSFORM);
      continue;
    }

    console.warn(`[Render Commands] Unhandled render command type: ${command.type}`);
  }



  if (isLastVisibleWorld && showCullingBounds && cullingBounds) {
    drawCullingBoundsOverlay(renderer, cullingBounds);
  }
}

