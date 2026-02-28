import type { LooseAssetManager } from "../../../../../asset/AssetManager";
import { EditorHoverHighlight, ShaderQuad, Shape, Sprite } from "../../../../../components";
import { Color } from "../../../../../components/sprite";
import { Transform2D } from "../../../../../components/transform";
import { resolveWorldTransform2D } from "../../../../../ecs/hierarchy";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  Renderer,
  RenderQueue,
} from "../../../../../render";

const SHARED_RENDER_TRANSFORM = new Transform2D();
const HOVER_TINT_COLOR = new Color(1, 1, 0, 1);
const SHARED_HOVER_TINT = new Color(1, 1, 1, 1);

export function renderCommands(
  queue: RenderQueue,
  renderer: Renderer,
  assets: LooseAssetManager,
  alpha: number,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
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

    if (command.type === "sprite-entity") {
      const sprite = world.get(entityId, Sprite);
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

    renderer.drawShape(shapeCommand);
  }
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

function isShaderSourceAsset(asset: unknown): asset is { type: "shader"; vertex: string; fragment: string } {
  if (!asset || typeof asset !== "object") {
    return false;
  }

  const type = Reflect.get(asset, "type");
  if (type !== "shader") {
    return false;
  }

  const vertex = Reflect.get(asset, "vertex");
  if (typeof vertex !== "string") {
    return false;
  }

  const fragment = Reflect.get(asset, "fragment");
  if (typeof fragment !== "string") {
    return false;
  }

  return true;
}
