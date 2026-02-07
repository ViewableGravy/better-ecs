import { useSystem, useWorld } from "@repo/engine";
import { Color, Shape, Sprite, Transform2D } from "@repo/engine/components";
import type { ShapeRenderData, SpriteRenderData } from "@repo/engine/render";
import { lerp } from "../render/utils";

const CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

const SHARED_SHAPE_DATA: ShapeRenderData = {
  type: "rectangle",
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  fill: new Color(),
  stroke: null,
  strokeWidth: 0,
};

const SHARED_SPRITE_DATA: SpriteRenderData = {
  texture: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  anchorX: 0.5,
  anchorY: 0.5,
  sourceX: 0,
  sourceY: 0,
  sourceWidth: 0,
  sourceHeight: 0,
  flipX: false,
  flipY: false,
  tint: new Color(),
};

export function CommitStage(): void {
  const world = useWorld();
  const { data } = useSystem("render");
  const renderer = data.renderer;
  const commands = data.commands;
  const alpha = data.custom.alpha ?? 0;

  renderer.beginFrame();
  renderer.clear(CLEAR_COLOR);

  for (const cmd of commands) {
    switch (cmd.kind) {
      case "setView":
        renderer.setCamera(cmd.view.x, cmd.view.y, cmd.view.zoom);
        break;

      case "shape": {
        const shape = world.get(cmd.entity, Shape);
        const transform = world.get(cmd.entity, Transform2D);

        if (!shape || !transform) continue;

        SHARED_SHAPE_DATA.type = shape.type;
        SHARED_SHAPE_DATA.x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
        SHARED_SHAPE_DATA.y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
        SHARED_SHAPE_DATA.width = shape.width;
        SHARED_SHAPE_DATA.height = shape.height;
        SHARED_SHAPE_DATA.rotation = transform.curr.rotation;
        SHARED_SHAPE_DATA.scaleX = transform.curr.scale.x;
        SHARED_SHAPE_DATA.scaleY = transform.curr.scale.y;
        SHARED_SHAPE_DATA.fill = shape.fill;
        SHARED_SHAPE_DATA.stroke = shape.stroke;
        SHARED_SHAPE_DATA.strokeWidth = shape.strokeWidth;

        renderer.drawShape(SHARED_SHAPE_DATA);
        break;
      }

      case "sprite": {
        const sprite = world.get(cmd.entity, Sprite);
        const transform = world.get(cmd.entity, Transform2D);

        if (!sprite || !transform) continue;

        // Lazily ensure the texture source is uploaded to the renderer
        let handle = renderer.getTextureHandle(sprite.texture.source.uid);
        if (handle === null) {
          handle = renderer.loadTexture(sprite.texture);
        }

        const tex = sprite.texture;
        const w = sprite.width || tex.width;
        const h = sprite.height || tex.height;

        SHARED_SPRITE_DATA.texture = handle;
        SHARED_SPRITE_DATA.x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
        SHARED_SPRITE_DATA.y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
        SHARED_SPRITE_DATA.width = w;
        SHARED_SPRITE_DATA.height = h;
        SHARED_SPRITE_DATA.rotation = transform.curr.rotation;
        SHARED_SPRITE_DATA.scaleX = transform.curr.scale.x;
        SHARED_SPRITE_DATA.scaleY = transform.curr.scale.y;
        SHARED_SPRITE_DATA.anchorX = sprite.anchorX;
        SHARED_SPRITE_DATA.anchorY = sprite.anchorY;
        SHARED_SPRITE_DATA.sourceX = tex.frameX;
        SHARED_SPRITE_DATA.sourceY = tex.frameY;
        SHARED_SPRITE_DATA.sourceWidth = tex.frameWidth;
        SHARED_SPRITE_DATA.sourceHeight = tex.frameHeight;
        SHARED_SPRITE_DATA.flipX = sprite.flipX;
        SHARED_SPRITE_DATA.flipY = sprite.flipY;
        SHARED_SPRITE_DATA.tint = sprite.tint;

        renderer.drawSprite(SHARED_SPRITE_DATA);
        break;
      }
    }
  }

  renderer.endFrame();
}