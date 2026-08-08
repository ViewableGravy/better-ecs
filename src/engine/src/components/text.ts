import { Component } from "@engine/ecs/component";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type Opts = {
  value?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  anchorX?: number;
  anchorY?: number;
  zOrder?: number;
  layer?: number;
};

type Args = [
  value?: string,
  fontSize?: number,
  fontFamily?: string,
  fontWeight?: string,
  anchorX?: number,
  anchorY?: number,
  zOrder?: number,
  layer?: number,
];

/**********************************************************************************************************
 *   CLASS START
 **********************************************************************************************************/
export class Text extends Component {
  public value: string;
  public fontSize: number;
  public fontFamily: string;
  public fontWeight: string;
  public anchorX: number;
  public anchorY: number;
  public zOrder: number;
  public layer: number;

  constructor(opts: Opts);
  constructor(...args: Args);
  constructor(...args: [...Args] | [Opts]) {
    super();

    if (typeof args[0] === "object") {
      const opts = args[0] as Opts;
      
      this.value = opts.value ?? "";
      this.fontSize = opts.fontSize ?? 16;
      this.fontFamily = opts.fontFamily ?? "sans-serif";
      this.fontWeight = opts.fontWeight ?? "400";
      this.anchorX = opts.anchorX ?? 0.5;
      this.anchorY = opts.anchorY ?? 0.5;
      this.zOrder = opts.zOrder ?? 0;
      this.layer = opts.layer ?? 0;
      return;
    }

    this.value = args[0] ?? "";
    this.fontSize = args[1] ?? 16;
    this.fontFamily = args[2] ?? "sans-serif";
    this.fontWeight = args[3] ?? "400";
    this.anchorX = args[4] ?? 0.5;
    this.anchorY = args[5] ?? 0.5;
    this.zOrder = args[6] ?? 0;
    this.layer = args[7] ?? 0;
  }
}