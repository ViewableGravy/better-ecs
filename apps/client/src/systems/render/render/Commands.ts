import type { EntityId } from "@repo/engine";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type View2D = {
  x: number;
  y: number;
  zoom: number;
  viewport?: Rect;
};

export type RenderCommand =
  | { kind: "setView"; view: View2D }
  | { kind: "shape"; entity: EntityId }
  | { kind: "sprite"; entity: EntityId };