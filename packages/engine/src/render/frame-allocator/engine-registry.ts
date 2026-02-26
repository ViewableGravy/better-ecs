import { Color } from "../../components/sprite";
import type { ShapeRenderData } from "../low-level";
import type { FramePoolFactory } from "./types";

type ShapeCommandFactory = FramePoolFactory<ShapeRenderData, readonly []>;
type NumberArrayFactory = FramePoolFactory<number[], readonly []>;

export type EngineFrameAllocatorRegistry = {
  "engine:shape-command": ShapeCommandFactory;
  "engine:number-array": NumberArrayFactory;
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
    },
  },
  "engine:number-array": {
    create: () => [],
    reset: (value) => {
      value.length = 0;
    },
  },
};
