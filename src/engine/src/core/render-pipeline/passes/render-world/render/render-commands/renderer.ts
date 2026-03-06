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
import { SHARED_RENDER_TRANSFORM } from "@engine/core/render-pipeline/passes/render-world/render/render-commands/const";
import type { SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import { getWorldTransform2D, resolveWorldTransform2D } from "@engine/ecs/hierarchy";
import type { Renderer, RenderQueue } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type RenderQueueBuckets = RenderQueue["buckets"];
type RenderQueueBucket = NonNullable<RenderQueueBuckets[number]>;
type RenderQueueCommands = RenderQueueBucket["commands"];
type RenderQueueCommand = NonNullable<RenderQueueCommands[number]>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
/**
 * Dispatches queued world-render commands in bucket order.
 *
 * Responsibilities are intentionally narrow:
 * - skip commands outside the active culling bounds
 * - resolve ECS-backed transforms before handler dispatch
 * - delegate actual draw behavior to the specialized handlers
 * - draw the culling overlay once after the last visible world
 */
export class RenderCommandRenderer {
  /**
   * Render all queued commands for the active render world.
   */
  public static render(): void {
    const queue = fromContext(FromRender.Queue);
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
    this.renderBuckets(queue.buckets, cullingBounds, interpolationAlpha, renderer, spriteRenderRecords);

    if (isLastVisibleWorld && showCullingBounds && cullingBounds) {
      drawCullingBoundsOverlay(renderer, cullingBounds);
    }
  }

  /**
   * Iterate each queue bucket in-order so layer and material grouping remain intact.
   */
  private static renderBuckets(
    buckets: RenderQueueBuckets,
    cullingBounds: CullingBounds | null,
    interpolationAlpha: number,
    renderer: Renderer,
    spriteRenderRecords: SpriteRenderRecord[],
  ): void {
    for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
      const bucket = buckets[bucketIndex];
      if (!bucket) {
        continue;
      }

      this.renderBucketCommands(bucket.commands, cullingBounds, interpolationAlpha, renderer, spriteRenderRecords);
    }
  }

  /**
   * Render the commands stored in a single bucket.
   */
  private static renderBucketCommands(
    commands: RenderQueueCommands,
    cullingBounds: CullingBounds | null,
    interpolationAlpha: number,
    renderer: Renderer,
    spriteRenderRecords: SpriteRenderRecord[],
  ): void {
    for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
      const command = commands[commandIndex];
      if (!command) {
        continue;
      }

      this.renderCommand(command, cullingBounds, interpolationAlpha, renderer, spriteRenderRecords);
    }
  }

  /**
   * Dispatch an individual queued command to its specialized renderer.
   */
  private static renderCommand(
    command: RenderQueueCommand,
    cullingBounds: CullingBounds | null,
    interpolationAlpha: number,
    renderer: Renderer,
    spriteRenderRecords: SpriteRenderRecord[],
  ): void {
    if (isShapeDrawRenderCommand(command)) {
      this.renderShapeDrawCommand(command, cullingBounds);
      return;
    }

    if (!isEntityRenderCommand(command)) {
      return;
    }

    this.renderEntityCommand(command, cullingBounds, interpolationAlpha, renderer, spriteRenderRecords);
  }

  /**
   * Render a raw shape draw command that does not require ECS transform lookup.
   */
  private static renderShapeDrawCommand(
    command: RenderQueueCommand,
    cullingBounds: CullingBounds | null,
  ): void {
    if (!isShapeDrawRenderCommand(command)) {
      return;
    }

    if (!isCommandWithinCullingBounds(command, cullingBounds)) {
      return;
    }

    handleShapeDrawCommand(command);
  }

  /**
   * Render an ECS-backed command after its world transform has been resolved.
   */
  private static renderEntityCommand(
    command: EntityRenderCommand,
    cullingBounds: CullingBounds | null,
    interpolationAlpha: number,
    renderer: Renderer,
    spriteRenderRecords: SpriteRenderRecord[],
  ): void {
    const { world, entityId } = command;
    const spriteRecord = this.resolveSpriteRecord(command, spriteRenderRecords);

    if (command.type === "sprite-entity" && spriteRecord) {
      handleSpriteEntityCommand(command, spriteRecord.worldTransform, renderer, interpolationAlpha, spriteRecord);
      return;
    }

    const didResolveTransform = this.resolveCommandWorldTransform(
      command,
      world,
      entityId,
      SHARED_RENDER_TRANSFORM,
      spriteRecord,
    );
    if (!didResolveTransform) {
      return;
    }

    const commandTransform = this.resolveCommandTransformRef(command, SHARED_RENDER_TRANSFORM, spriteRecord);
    if (!isCommandWithinCullingBounds(command, cullingBounds, commandTransform, interpolationAlpha, spriteRecord)) {
      return;
    }

    if (command.type === "shader-entity") {
      handleShaderEntityCommand(command, commandTransform);
      return;
    }

    if (command.type === "shape-entity") {
      handleShapeEntityCommand(command, commandTransform);
      return;
    }

    console.warn(`[Render Commands] Unhandled render command type: ${command.type}`);
  }

  /**
   * Resolve the precomputed sprite record for a queued sprite command.
   */
  private static resolveSpriteRecord(
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

  /**
   * Resolve the transform used for culling and draw dispatch.
   *
   * Sprite commands can reuse their cached sprite record transform. All other
   * commands resolve from the world hierarchy into the shared scratch transform.
   */
  private static resolveCommandWorldTransform(
    command: EntityRenderCommand,
    world: EntityRenderCommand["world"],
    entityId: EntityRenderCommand["entityId"],
    out: typeof SHARED_RENDER_TRANSFORM,
    spriteRecord: SpriteRenderRecord | null,
  ): boolean {
    if (command.type === "sprite-entity" && spriteRecord) {
      return true;
    }

    const worldTransform = getWorldTransform2D(world, entityId);
    if (worldTransform) {
      out.curr.copyFrom(worldTransform.curr);
      out.prev.copyFrom(worldTransform.prev);
      return true;
    }

    return resolveWorldTransform2D(world, entityId, out);
  }

  /**
   * Return the transform reference that should be forwarded to the render handlers.
   */
  private static resolveCommandTransformRef(
    command: EntityRenderCommand,
    fallback: typeof SHARED_RENDER_TRANSFORM,
    spriteRecord: SpriteRenderRecord | null,
  ): typeof SHARED_RENDER_TRANSFORM {
    if (command.type === "sprite-entity" && spriteRecord) {
      return spriteRecord.worldTransform;
    }

    return fallback;
  }
}