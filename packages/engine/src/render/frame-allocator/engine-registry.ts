import { Color } from "@components/sprite/sprite";
import type { FramePoolFactory } from "@render/frame-allocator/types";
import type { RenderCommand } from "@render/queue/render-queue";
import type { DenseShapeRenderData } from "@render/types/low-level";

type ShapeCommandFactory = FramePoolFactory<DenseShapeRenderData, readonly []>;
type NumberArrayFactory = FramePoolFactory<number[], readonly []>;
type RenderCommandFactory = FramePoolFactory<RenderCommand, readonly []>;

export type EngineFrameAllocatorRegistry = {
  "engine:shape-command": ShapeCommandFactory;
  "engine:number-array": NumberArrayFactory;
  "engine:render-command": RenderCommandFactory;
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
      layer: 0,
      zOrder: 0,
      sequence: 0,
    }),
    reset: (value) => {
      value.type = "shape-entity";
      value.world = null;
      value.entityId = null;
      value.shape = null;
      value.layer = 0;
      value.zOrder = 0;
      value.sequence = 0;
    },
  },
};
