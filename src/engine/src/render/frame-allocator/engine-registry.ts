import { Rgba } from "@engine/components/sprite/sprite";
import { createPoolFactory } from "@engine/core/allocator";
import type { FramePoolFactory } from "@engine/render/frame-allocator/types";
import type { RenderCommand } from "@engine/render/queue/render-queue";
import type { DenseShapeRenderData, TextRenderData } from "@engine/render/types/low-level";

type ShapeCommandFactory = FramePoolFactory<DenseShapeRenderData, readonly []>;
type RenderCommandFactory = FramePoolFactory<RenderCommand, readonly []>;
type TextCommandFactory = FramePoolFactory<TextRenderData, readonly []>;

export type EngineFrameAllocatorRegistry = {
  "engine:shape-command": ShapeCommandFactory;
  "engine:render-command": RenderCommandFactory;
  "engine:text-command": TextCommandFactory;
};

export const engineFrameAllocatorRegistry: EngineFrameAllocatorRegistry = {
  "engine:shape-command": createPoolFactory(
    (): DenseShapeRenderData => ({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fill: new Rgba(1, 1, 1, 1),
      stroke: null,
      strokeWidth: 0,
      fillEnabled: true,
      arcEnabled: false,
      arcStart: 0,
      arcEnd: Math.PI * 2,
      cornerRadius: 0,
    }),
    (value) => {
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
  ),
  "engine:render-command": createPoolFactory(
    (): RenderCommand => ({
      type: "shape-entity",
      registry: null,
      entityId: null,
      shape: null,
      scope: "gameplay",
      bucketKind: "shape",
      bucketKey: "shape",
      layer: 0,
      zOrder: 0,
    }),
    (value) => {
      value.type = "shape-entity";
      value.registry = null;
      value.entityId = null;
      value.shape = null;
      value.scope = "gameplay";
      value.bucketKind = "shape";
      value.bucketKey = "shape";
      value.layer = 0;
      value.zOrder = 0;
    },
  ),
  "engine:text-command": createPoolFactory(
    (): TextRenderData => ({
      text: "",
      fontSize: 16,
      fontFamily: "sans-serif",
      fontWeight: "400",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
      tint: new Rgba(1, 1, 1, 1),
    }),
    (value) => {
      value.text = "";
      value.fontSize = 16;
      value.fontFamily = "sans-serif";
      value.fontWeight = "400";
      value.x = 0;
      value.y = 0;
      value.rotation = 0;
      value.scaleX = 1;
      value.scaleY = 1;
      value.anchorX = 0.5;
      value.anchorY = 0.5;
      value.tint.r = 1;
      value.tint.g = 1;
      value.tint.b = 1;
      value.tint.a = 1;
    },
  ),
};
