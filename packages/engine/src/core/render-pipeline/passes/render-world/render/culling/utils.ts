import { AnimatedSprite, ShaderQuad, Shape, Sprite } from "@components";
import type { Transform2D } from "@components/transform";
import { type EngineAndRenderContextOptions } from "@context";
import type { RegisteredEngine } from "@core/engine-types";
import type { AnyRenderPipelineContext } from "@core/render-pipeline/context";
import type { RenderCommand } from "@render/queue/render-queue";
import type { ShapeRenderInput } from "@render/types/low-level";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type CullingBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type CullingViewport = {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
};

export type SpriteEntityRenderCommand = RenderCommand & {
  type: "sprite-entity";
  world: NonNullable<RenderCommand["world"]>;
  entityId: NonNullable<RenderCommand["entityId"]>;
};

export type ShaderEntityRenderCommand = RenderCommand & {
  type: "shader-entity";
  world: NonNullable<RenderCommand["world"]>;
  entityId: NonNullable<RenderCommand["entityId"]>;
};

export type ShapeEntityRenderCommand = RenderCommand & {
  type: "shape-entity";
  world: NonNullable<RenderCommand["world"]>;
  entityId: NonNullable<RenderCommand["entityId"]>;
};

export type EntityRenderCommand =
  | SpriteEntityRenderCommand
  | ShaderEntityRenderCommand
  | ShapeEntityRenderCommand;
export type ShapeDrawRenderCommand = RenderCommand & {
  type: "shape-draw";
  shape: ShapeRenderInput;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function resolveCullingBounds(
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  cullingEnabled: boolean,
  viewportScaleX: number,
  viewportScaleY: number,
  viewportWidth: number,
  viewportHeight: number,
): CullingBounds | null {
  if (!cullingEnabled) {
    return null;
  }

  if (cameraZoom <= 0) {
    return null;
  }

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const halfWidth = (viewportWidth * viewportScaleX) / (cameraZoom * 2);
  const halfHeight = (viewportHeight * viewportScaleY) / (cameraZoom * 2);

  return {
    minX: cameraX - halfWidth,
    maxX: cameraX + halfWidth,
    minY: cameraY - halfHeight,
    maxY: cameraY + halfHeight,
  };
}

export const CullingBounds: EngineAndRenderContextOptions<CullingBounds | null> = {
  type: "engine+render",
  select: (
    engine: RegisteredEngine,
    renderContext: AnyRenderPipelineContext,
  ) => {
    const canvasRect = engine.canvas.getBoundingClientRect();

    invariant(canvasRect.width > 0, "Render pipeline requires a canvas width greater than 0");
    invariant(canvasRect.height > 0, "Render pipeline requires a canvas height greater than 0");

    return resolveCullingBounds(
      renderContext.renderer.getCameraX(),
      renderContext.renderer.getCameraY(),
      renderContext.renderer.getCameraZoom(),
      engine.renderCulling.enabled,
      engine.renderCulling.viewportScaleX,
      engine.renderCulling.viewportScaleY,
      canvasRect.width,
      canvasRect.height,
    );
  },
};

export function isCommandWithinCullingBounds(command: ShapeDrawRenderCommand, bounds: CullingBounds | null): boolean;
export function isCommandWithinCullingBounds(command: EntityRenderCommand, bounds: CullingBounds | null, transform: Transform2D, alpha: number): boolean;
export function isCommandWithinCullingBounds(
  command: ShapeDrawRenderCommand | EntityRenderCommand,
  bounds: CullingBounds | null,
  transform?: Transform2D,
  alpha?: number,
): boolean {
  if (!bounds) {
    return true;
  }

  switch (command.type) {
    case "sprite-entity":
      invariant(transform, "Culling sprite-entity command requires a world transform");
      invariant(alpha !== undefined, "Culling sprite-entity command requires alpha");
      return intersectsSpriteEntity(command, bounds, transform, alpha);
    case "shader-entity":
      invariant(transform, "Culling shader-entity command requires a world transform");
      invariant(alpha !== undefined, "Culling shader-entity command requires alpha");
      return intersectsShaderEntity(command, bounds, transform, alpha);
    case "shape-entity":
      invariant(transform, "Culling shape-entity command requires a world transform");
      invariant(alpha !== undefined, "Culling shape-entity command requires alpha");
      return intersectsShapeEntity(command, bounds, transform, alpha);
    case "shape-draw":
      return intersectsShapeDraw(command, bounds);
    default:
      return true;
  }
}

export function isShapeDrawRenderCommand(command: RenderCommand): command is ShapeDrawRenderCommand {
  return command.type === "shape-draw" && command.shape !== null;
}

export function isEntityRenderCommand(command: RenderCommand): command is EntityRenderCommand {
  if (command.type === "shape-draw") {
    return false;
  }

  return command.world !== null && command.entityId !== null;
}

function intersectsSpriteEntity(
  command: SpriteEntityRenderCommand,
  bounds: CullingBounds,
  transform: Transform2D,
  alpha: number,
): boolean {
  const world = command.world;
  const entityId = command.entityId;

  invariant(world, "Culling sprite-entity command requires world");
  invariant(entityId !== null, "Culling sprite-entity command requires entityId");

  const staticSprite = world.get(entityId, Sprite);
  const sprite = staticSprite ?? world.get(entityId, AnimatedSprite);
  if (!sprite) {
    return true;
  }

  const worldX = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
  const worldY = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
  const viewport = resolveAnchorViewport(
    worldX,
    worldY,
    transform,
    sprite.width,
    sprite.height,
    sprite.anchorX,
    sprite.anchorY,
  );

  if (!viewport) {
    return true;
  }

  return intersects(bounds, viewport);
}

function intersectsShaderEntity(
  command: ShaderEntityRenderCommand,
  bounds: CullingBounds,
  transform: Transform2D,
  alpha: number,
): boolean {
  const world = command.world;
  const entityId = command.entityId;

  invariant(world, "Culling shader-entity command requires world");
  invariant(entityId !== null, "Culling shader-entity command requires entityId");

  const shaderQuad = world.get(entityId, ShaderQuad);
  if (!shaderQuad) {
    return true;
  }

  const worldX = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
  const worldY = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
  const viewport = resolveAnchorViewport(
    worldX,
    worldY,
    transform,
    shaderQuad.width,
    shaderQuad.height,
    shaderQuad.anchorX,
    shaderQuad.anchorY,
  );

  if (!viewport) {
    return true;
  }

  return intersects(bounds, viewport);
}

function intersectsShapeEntity(
  command: ShapeEntityRenderCommand,
  bounds: CullingBounds,
  transform: Transform2D,
  alpha: number,
): boolean {
  const world = command.world;
  const entityId = command.entityId;

  invariant(world, "Culling shape-entity command requires world");
  invariant(entityId !== null, "Culling shape-entity command requires entityId");

  const shape = world.get(entityId, Shape);
  if (!shape) {
    return true;
  }

  const centerX = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
  const centerY = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
  const viewport = resolveCenteredViewport(
    centerX,
    centerY,
    transform.curr.rotation,
    shape.width,
    shape.height,
    transform.curr.scale.x,
    transform.curr.scale.y,
  );

  if (!viewport) {
    return true;
  }

  return intersects(bounds, viewport);
}

function intersectsShapeDraw(
  command: ShapeDrawRenderCommand,
  bounds: CullingBounds,
): boolean {
  const { shape } = command;
  const viewport = resolveCenteredViewport(
    shape.x,
    shape.y,
    shape.rotation,
    shape.width,
    shape.height,
    shape.scaleX,
    shape.scaleY,
  );

  if (!viewport) {
    return true;
  }

  return intersects(bounds, viewport);
}

function resolveAnchorViewport(
  pivotX: number,
  pivotY: number,
  transform: Transform2D,
  width: number,
  height: number,
  anchorX: number,
  anchorY: number,
): CullingViewport | null {
  const absoluteWidth = Math.abs(width * transform.curr.scale.x);
  const absoluteHeight = Math.abs(height * transform.curr.scale.y);

  if (absoluteWidth <= 0 || absoluteHeight <= 0) {
    return null;
  }

  const centerOffsetX = (0.5 - anchorX) * absoluteWidth;
  const centerOffsetY = (0.5 - anchorY) * absoluteHeight;

  const sin = Math.sin(transform.curr.rotation);
  const cos = Math.cos(transform.curr.rotation);

  const centerX = pivotX + centerOffsetX * cos - centerOffsetY * sin;
  const centerY = pivotY + centerOffsetX * sin + centerOffsetY * cos;

  const halfWidth = absoluteWidth * 0.5;
  const halfHeight = absoluteHeight * 0.5;

  const aabbHalfWidth = Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight;
  const aabbHalfHeight = Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight;

  return {
    centerX,
    centerY,
    halfWidth: aabbHalfWidth,
    halfHeight: aabbHalfHeight,
  };
}

function resolveCenteredViewport(
  centerX: number,
  centerY: number,
  rotation: number,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
): CullingViewport | null {
  const absoluteWidth = Math.abs(width * scaleX);
  const absoluteHeight = Math.abs(height * scaleY);

  if (absoluteWidth <= 0 || absoluteHeight <= 0) {
    return null;
  }

  const halfWidth = absoluteWidth * 0.5;
  const halfHeight = absoluteHeight * 0.5;
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);

  return {
    centerX,
    centerY,
    halfWidth: Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight,
    halfHeight: Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight,
  };
}

function intersects(bounds: CullingBounds, viewport: CullingViewport): boolean {
  const minX = viewport.centerX - viewport.halfWidth;
  const maxX = viewport.centerX + viewport.halfWidth;
  const minY = viewport.centerY - viewport.halfHeight;
  const maxY = viewport.centerY + viewport.halfHeight;

  return minX <= bounds.maxX
    && maxX >= bounds.minX
    && minY <= bounds.maxY
    && maxY >= bounds.minY;
}

function lerp(previous: number, current: number, alpha: number): number {
  return previous + (current - previous) * alpha;
}
