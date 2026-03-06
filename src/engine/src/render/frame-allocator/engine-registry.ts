import { Sprite } from "@engine/components";
import { Color } from "@engine/components/sprite/sprite";
import { Transform2D } from "@engine/components/transform";
import {
  SPRITE_RENDER_DIRTY_NONE,
  type SpriteRenderRecord,
} from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import type { FramePoolFactory } from "@engine/render/frame-allocator/types";
import type { RenderCommand } from "@engine/render/queue/render-queue";
import type { DenseShapeRenderData } from "@engine/render/types/low-level";

type ShapeCommandFactory = FramePoolFactory<DenseShapeRenderData, readonly []>;
type NumberArrayFactory = FramePoolFactory<number[], readonly []>;
type RenderCommandFactory = FramePoolFactory<RenderCommand, readonly []>;
type SpriteRenderRecordFactory = FramePoolFactory<SpriteRenderRecord, readonly []>;

export type EngineFrameAllocatorRegistry = {
  "engine:shape-command": ShapeCommandFactory;
  "engine:number-array": NumberArrayFactory;
  "engine:render-command": RenderCommandFactory;
  "engine:sprite-render-record": SpriteRenderRecordFactory;
};

export const engineFrameAllocatorRegistry: EngineFrameAllocatorRegistry = {
  "engine:shape-command": {
    create: () => ({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fill: new Color(1, 1, 1, 1),
      stroke: null,
      strokeWidth: 0,
      fillEnabled: true,
      arcEnabled: false,
      arcStart: 0,
      arcEnd: Math.PI * 2,
      cornerRadius: 0,
    }),
    reset: (value) => {
      value.type = "rectangle";
      value.x = 0;
      value.y = 0;
      value.width = 0;
      value.height = 0;
      value.rotation = 0;
      value.scaleX = 1;
      value.scaleY = 1;
      value.fill.r = 1;
      value.fill.g = 1;
      value.fill.b = 1;
      value.fill.a = 1;
      value.stroke = null;
      value.strokeWidth = 0;
      value.fillEnabled = true;
      value.arcEnabled = false;
      value.arcStart = 0;
      value.arcEnd = Math.PI * 2;
      value.cornerRadius = 0;
    },
  },
  "engine:number-array": {
    create: () => [],
    reset: (value) => {
      value.length = 0;
    },
  },
  "engine:render-command": {
    create: () => ({
      type: "shape-entity",
      world: null,
      entityId: null,
      shape: null,
      scope: "gameplay",
      bucketKind: "shape",
      bucketKey: "shape",
      layer: 0,
      zOrder: 0,
      sequence: 0,
      spriteRecordIndex: undefined,
    }),
    reset: (value) => {
      value.type = "shape-entity";
      value.world = null;
      value.entityId = null;
      value.shape = null;
      value.scope = "gameplay";
      value.bucketKind = "shape";
      value.bucketKey = "shape";
      value.layer = 0;
      value.zOrder = 0;
      value.sequence = 0;
      value.spriteRecordIndex = undefined;
    },
  },
  "engine:sprite-render-record": {
    create: () => ({
      sprite: new Sprite(""),
      worldTransform: new Transform2D(),
      spriteVersion: 0,
      transformVersion: 0,
      dirtyMask: SPRITE_RENDER_DIRTY_NONE,
      isVisible: true,
    }),
    reset: (value) => {
      value.sprite.assetId = "";
      value.sprite.width = 0;
      value.sprite.height = 0;
      value.sprite.anchorX = 0.5;
      value.sprite.anchorY = 0.5;
      value.sprite.flipX = false;
      value.sprite.flipY = false;
      value.sprite.layer = 0;
      value.sprite.zOrder = 0;
      value.sprite.tint.r = 1;
      value.sprite.tint.g = 1;
      value.sprite.tint.b = 1;
      value.sprite.tint.a = 1;
      value.worldTransform.curr.pos.x = 0;
      value.worldTransform.curr.pos.y = 0;
      value.worldTransform.curr.rotation = 0;
      value.worldTransform.curr.scale.x = 1;
      value.worldTransform.curr.scale.y = 1;
      value.worldTransform.prev.pos.x = 0;
      value.worldTransform.prev.pos.y = 0;
      value.worldTransform.prev.rotation = 0;
      value.worldTransform.prev.scale.x = 1;
      value.worldTransform.prev.scale.y = 1;
      value.spriteVersion = 0;
      value.transformVersion = 0;
      value.dirtyMask = SPRITE_RENDER_DIRTY_NONE;
      value.isVisible = true;
    },
  },
};
