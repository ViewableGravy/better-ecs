import type { LooseAssetManager } from "@assets/AssetManager";
import { isShaderSourceAsset } from "@assets/utils";
import { AnimatedSprite, EditorHoverHighlight, ShaderQuad, Shape, Sprite } from "@components";
import { getFrameAssetIdAtTime } from "@components/sprite/animated";
import { Color } from "@components/sprite/sprite";
import { Transform2D } from "@components/transform";
import { fromContext, FromEngine, FromRender } from "@context";
import type { EntityId } from "@ecs/entity";
import { resolveWorldTransform2D } from "@ecs/hierarchy";
import type { UserWorld } from "@ecs/world";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  Renderer,
  RenderQueue,
} from "@render";

type CullingBounds = {
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

const SHARED_RENDER_TRANSFORM = new Transform2D();
const HOVER_TINT_COLOR = new Color(1, 1, 0, 1);
const SHARED_HOVER_TINT = new Color(1, 1, 1, 1);
const CULLING_DEBUG_STROKE = new Color(0, 1, 0.2, 0.9);
let SHARED_ANIMATED_RENDER_SPRITE: Sprite | null = null;

export function renderCommands(
  queue: RenderQueue = fromContext(FromRender.Queue),
  renderer: Renderer = fromContext(FromRender.Renderer),
  assets: LooseAssetManager = fromContext(FromEngine.Assets),
  alpha: number = fromContext(FromRender.Alpha),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(FromRender.FrameAllocator,),
): void {
  const now = performance.now();
  const engine = fromContext(FromEngine.Engine);
  const activeRenderWorld = fromContext(FromRender.World);
  const visibleWorlds = fromContext(FromRender.VisibleWorlds);
  const isLastVisibleWorld =
    visibleWorlds.length === 0 || visibleWorlds[visibleWorlds.length - 1] === activeRenderWorld;
  const showQuadOutlines = engine.editor.viewState.showQuadOutlines;
  const showCullingBounds = engine.editor.viewState.showCullingBounds || engine.renderCulling.debugOutline;
  const canvasRect = engine.canvas.getBoundingClientRect();
  const cullingBounds = resolveCullingBounds(
    renderer,
    engine.renderCulling,
    canvasRect.width > 0 ? canvasRect.width : renderer.getWidth(),
    canvasRect.height > 0 ? canvasRect.height : renderer.getHeight(),
  );

  renderer.setMeshOverlayEnabled(showQuadOutlines);

  for (const command of queue.commands) {
    if (command.type === "shape-draw") {
      if (command.shape) {
        renderer.drawShape(command.shape);
      }
      continue;
    }

    const world = command.world;
    const entityId = command.entityId;
    if (!world || entityId === null) {
      continue;
    }

    if (!resolveWorldTransform2D(world, entityId, SHARED_RENDER_TRANSFORM)) {
      continue;
    }

    if (
      cullingBounds
      && !isCommandWithinCullingBounds(command.type, world, entityId, SHARED_RENDER_TRANSFORM, alpha, cullingBounds)
    ) {
      continue;
    }

    if (command.type === "sprite-entity") {
      const staticSprite = world.get(entityId, Sprite);
      const sprite = staticSprite ?? projectAnimatedSprite(world.get(entityId, AnimatedSprite), now);
      if (!sprite) {
        continue;
      }

      const hoverHighlight = world.get(entityId, EditorHoverHighlight);
      if (!hoverHighlight) {
        renderer.render(sprite, SHARED_RENDER_TRANSFORM, alpha);
        continue;
      }

      const originalR = sprite.tint.r;
      const originalG = sprite.tint.g;
      const originalB = sprite.tint.b;

      sprite.tint.r = blendChannel(sprite.tint.r, HOVER_TINT_COLOR.r, hoverHighlight.amount);
      sprite.tint.g = blendChannel(sprite.tint.g, HOVER_TINT_COLOR.g, hoverHighlight.amount);
      sprite.tint.b = blendChannel(sprite.tint.b, HOVER_TINT_COLOR.b, hoverHighlight.amount);

      renderer.render(sprite, SHARED_RENDER_TRANSFORM, alpha);

      sprite.tint.r = originalR;
      sprite.tint.g = originalG;
      sprite.tint.b = originalB;

      continue;
    }

    if (command.type === "shader-entity") {
      const shaderQuad = world.get(entityId, ShaderQuad);
      if (!shaderQuad) {
        continue;
      }

      const loadedShader = assets.getLoose(shaderQuad.assetId);
      if (!isShaderSourceAsset(loadedShader)) {
        continue;
      }

      const hoverHighlight = world.get(entityId, EditorHoverHighlight);
      const tint = hoverHighlight
        ? blendColor(shaderQuad.tint, HOVER_TINT_COLOR, hoverHighlight.amount)
        : shaderQuad.tint;

      renderer.drawTexturedQuad({
        shader: loadedShader,
        x: SHARED_RENDER_TRANSFORM.prev.pos.x +
          (SHARED_RENDER_TRANSFORM.curr.pos.x - SHARED_RENDER_TRANSFORM.prev.pos.x) * alpha,
        y: SHARED_RENDER_TRANSFORM.prev.pos.y +
          (SHARED_RENDER_TRANSFORM.curr.pos.y - SHARED_RENDER_TRANSFORM.prev.pos.y) * alpha,
        width: shaderQuad.width,
        height: shaderQuad.height,
        rotation: SHARED_RENDER_TRANSFORM.curr.rotation,
        scaleX: SHARED_RENDER_TRANSFORM.curr.scale.x,
        scaleY: SHARED_RENDER_TRANSFORM.curr.scale.y,
        anchorX: shaderQuad.anchorX,
        anchorY: shaderQuad.anchorY,
        tint,
        time: shaderQuad.useTime ? performance.now() : 0,
      });

      continue;
    }

    const shape = world.get(entityId, Shape);
    if (!shape) {
      continue;
    }

    const shapeCommand = frameAllocator.acquire("engine:shape-command");
    shapeCommand.type = shape.type;
    shapeCommand.x = SHARED_RENDER_TRANSFORM.prev.pos.x +
      (SHARED_RENDER_TRANSFORM.curr.pos.x - SHARED_RENDER_TRANSFORM.prev.pos.x) * alpha;
    shapeCommand.y = SHARED_RENDER_TRANSFORM.prev.pos.y +
      (SHARED_RENDER_TRANSFORM.curr.pos.y - SHARED_RENDER_TRANSFORM.prev.pos.y) * alpha;
    shapeCommand.width = shape.width;
    shapeCommand.height = shape.height;
    shapeCommand.rotation = SHARED_RENDER_TRANSFORM.curr.rotation;
    shapeCommand.scaleX = SHARED_RENDER_TRANSFORM.curr.scale.x;
    shapeCommand.scaleY = SHARED_RENDER_TRANSFORM.curr.scale.y;
    shapeCommand.fill.r = shape.fill.r;
    shapeCommand.fill.g = shape.fill.g;
    shapeCommand.fill.b = shape.fill.b;
    shapeCommand.fill.a = shape.fill.a;

    const hoverHighlight = world.get(entityId, EditorHoverHighlight);
    if (hoverHighlight) {
      shapeCommand.fill.r = blendChannel(shapeCommand.fill.r, HOVER_TINT_COLOR.r, hoverHighlight.amount);
      shapeCommand.fill.g = blendChannel(shapeCommand.fill.g, HOVER_TINT_COLOR.g, hoverHighlight.amount);
      shapeCommand.fill.b = blendChannel(shapeCommand.fill.b, HOVER_TINT_COLOR.b, hoverHighlight.amount);
    }

    if (shape.stroke) {
      if (shapeCommand.stroke === null) {
        shapeCommand.stroke = new Color(shape.stroke.r, shape.stroke.g, shape.stroke.b, shape.stroke.a);
      } else {
        shapeCommand.stroke.r = shape.stroke.r;
        shapeCommand.stroke.g = shape.stroke.g;
        shapeCommand.stroke.b = shape.stroke.b;
        shapeCommand.stroke.a = shape.stroke.a;
      }

      if (hoverHighlight && shapeCommand.stroke) {
        shapeCommand.stroke.r = blendChannel(shapeCommand.stroke.r, HOVER_TINT_COLOR.r, hoverHighlight.amount);
        shapeCommand.stroke.g = blendChannel(shapeCommand.stroke.g, HOVER_TINT_COLOR.g, hoverHighlight.amount);
        shapeCommand.stroke.b = blendChannel(shapeCommand.stroke.b, HOVER_TINT_COLOR.b, hoverHighlight.amount);
      }
    } else {
      shapeCommand.stroke = null;
    }

    shapeCommand.strokeWidth = shape.strokeWidth;
    shapeCommand.fillEnabled = true;
    shapeCommand.arcEnabled = false;
    shapeCommand.arcStart = 0;
    shapeCommand.arcEnd = Math.PI * 2;
    shapeCommand.cornerRadius = 0;

    renderer.drawShape(shapeCommand);
  }

  if (isLastVisibleWorld && showCullingBounds && cullingBounds) {
    drawCullingBounds(renderer, cullingBounds);
  }
}

function resolveCullingBounds(
  renderer: Pick<Renderer, "getWidth" | "getHeight" | "getCameraX" | "getCameraY" | "getCameraZoom">,
  culling: { enabled: boolean; viewportScaleX: number; viewportScaleY: number },
  viewportWidth: number,
  viewportHeight: number,
): CullingBounds | null {
  if (!culling.enabled) {
    return null;
  }

  const zoom = renderer.getCameraZoom();
  if (zoom <= 0) {
    return null;
  }

  const width = viewportWidth;
  const height = viewportHeight;

  if (width <= 0 || height <= 0) {
    return null;
  }

  const halfWidth = (width * culling.viewportScaleX) / (zoom * 2);
  const halfHeight = (height * culling.viewportScaleY) / (zoom * 2);

  const centerX = renderer.getCameraX();
  const centerY = renderer.getCameraY();

  return {
    minX: centerX - halfWidth,
    maxX: centerX + halfWidth,
    minY: centerY - halfHeight,
    maxY: centerY + halfHeight,
  };
}

function drawCullingBounds(
  renderer: Pick<Renderer, "drawShape">,
  bounds: CullingBounds,
): void {
  const minX = bounds.minX;
  const maxX = bounds.maxX;
  const minY = bounds.minY;
  const maxY = bounds.maxY;

  drawCullingLine(renderer, minX, minY, maxX, minY);
  drawCullingLine(renderer, maxX, minY, maxX, maxY);
  drawCullingLine(renderer, maxX, maxY, minX, maxY);
  drawCullingLine(renderer, minX, maxY, minX, minY);
}

function drawCullingLine(
  renderer: Pick<Renderer, "drawShape">,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const length = Math.hypot(deltaX, deltaY);

  if (length <= 0) {
    return;
  }

  renderer.drawShape({
    type: "line",
    x: (fromX + toX) * 0.5,
    y: (fromY + toY) * 0.5,
    width: length,
    height: 1,
    rotation: Math.atan2(deltaY, deltaX),
    scaleX: 1,
    scaleY: 1,
    fill: CULLING_DEBUG_STROKE,
    stroke: CULLING_DEBUG_STROKE,
    strokeWidth: 2,
  });
}

function isCommandWithinCullingBounds(
  commandType: "sprite-entity" | "shader-entity" | "shape-entity" | "shape-draw",
  world: UserWorld,
  entityId: EntityId,
  transform: Transform2D,
  alpha: number,
  bounds: CullingBounds,
): boolean {
  if (commandType === "shape-draw") {
    return true;
  }

  const worldX = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
  const worldY = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);

  if (commandType === "sprite-entity") {
    const staticSprite = world.get(entityId, Sprite);
    const sprite = staticSprite ?? world.get(entityId, AnimatedSprite);
    if (!sprite) {
      return true;
    }

    const spriteViewport = resolveAnchorViewport(
      worldX,
      worldY,
      transform,
      sprite.width,
      sprite.height,
      sprite.anchorX,
      sprite.anchorY,
    );

    if (!spriteViewport) {
      return true;
    }

    return intersects(bounds, spriteViewport);
  }

  if (commandType === "shader-entity") {
    const shaderQuad = world.get(entityId, ShaderQuad);
    if (!shaderQuad) {
      return true;
    }

    const quadViewport = resolveAnchorViewport(
      worldX,
      worldY,
      transform,
      shaderQuad.width,
      shaderQuad.height,
      shaderQuad.anchorX,
      shaderQuad.anchorY,
    );

    if (!quadViewport) {
      return true;
    }

    return intersects(bounds, quadViewport);
  }

  const shape = world.get(entityId, Shape);
  if (!shape) {
    return true;
  }

  const shapeViewport = resolveCenteredViewport(worldX, worldY, transform, shape.width, shape.height);
  if (!shapeViewport) {
    return true;
  }

  return intersects(bounds, shapeViewport);
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
  transform: Transform2D,
  width: number,
  height: number,
): CullingViewport | null {
  const absoluteWidth = Math.abs(width * transform.curr.scale.x);
  const absoluteHeight = Math.abs(height * transform.curr.scale.y);

  if (absoluteWidth <= 0 || absoluteHeight <= 0) {
    return null;
  }

  const halfWidth = absoluteWidth * 0.5;
  const halfHeight = absoluteHeight * 0.5;
  const sin = Math.sin(transform.curr.rotation);
  const cos = Math.cos(transform.curr.rotation);

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

/**
 * Creates a frame-projected sprite view from an animated sprite at a specific time.
 *
 * This avoids mutating ECS animation state while still allowing the renderer to
 * consume the standard `Sprite` interface.
 */
function projectAnimatedSprite(animatedSprite: AnimatedSprite | undefined, timeMs: number): Sprite | null {
  if (!animatedSprite) {
    return null;
  }

  const sampledAssetId = getFrameAssetIdAtTime(animatedSprite, timeMs);
  if (!SHARED_ANIMATED_RENDER_SPRITE) {
    SHARED_ANIMATED_RENDER_SPRITE = new Sprite(sampledAssetId);
  }

  const projected = SHARED_ANIMATED_RENDER_SPRITE;
  projected.assetId = sampledAssetId;
  projected.width = animatedSprite.width;
  projected.height = animatedSprite.height;
  projected.anchorX = animatedSprite.anchorX;
  projected.anchorY = animatedSprite.anchorY;
  projected.flipX = animatedSprite.flipX;
  projected.flipY = animatedSprite.flipY;
  projected.layer = animatedSprite.layer;
  projected.zOrder = animatedSprite.zOrder;
  projected.tint.r = animatedSprite.tint.r;
  projected.tint.g = animatedSprite.tint.g;
  projected.tint.b = animatedSprite.tint.b;
  projected.tint.a = animatedSprite.tint.a;
  return projected;
}

function blendChannel(base: number, tint: number, amount: number): number {
  return base + (tint - base) * amount;
}

function blendColor(base: Color, tint: Color, amount: number): Color {
  const color = SHARED_HOVER_TINT;
  color.r = blendChannel(base.r, tint.r, amount);
  color.g = blendChannel(base.g, tint.g, amount);
  color.b = blendChannel(base.b, tint.b, amount);
  color.a = base.a;
  return color;
}

