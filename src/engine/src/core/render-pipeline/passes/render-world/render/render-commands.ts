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
  const spriteRenderRecords = frameAllocator.scratch<SpriteRenderRecord>("engine:sprite-render-records");
  
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
    const spriteRecord = resolveSpriteRecord(command, spriteRenderRecords);
    const didResolveTransform = resolveCommandWorldTransform(command, world, entityId, SHARED_RENDER_TRANSFORM, spriteRecord);
    if (!didResolveTransform) {
      continue;
    }

    const commandTransform = resolveCommandTransformRef(command, SHARED_RENDER_TRANSFORM, spriteRecord);

    if (!isCommandWithinCullingBounds(command, cullingBounds, commandTransform, interpolationAlpha, spriteRecord))
      continue;

    if (command.type === "sprite-entity") {
      handleSpriteEntityCommand(command, commandTransform, renderer, interpolationAlpha, spriteRecord);
      continue;
    }

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



  if (isLastVisibleWorld && showCullingBounds && cullingBounds) {
    drawCullingBoundsOverlay(renderer, cullingBounds);
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

