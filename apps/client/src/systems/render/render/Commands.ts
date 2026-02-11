
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