import { Rgba } from "@engine/components/sprite/sprite";
import { Component } from "@engine/ecs/component";

class RgbaVisualComponent extends Component {
  readonly #value: Rgba;

  get value(): Rgba {
    return this.#value;
  }

  set value(value: Rgba) {
    this.#value.copyFrom(value);
  }

  constructor(value: Rgba = new Rgba()) {
    super();
    this.#value = new Rgba(value.r, value.g, value.b, value.a);
  }
}

export class Color extends RgbaVisualComponent {}
export class Tint extends RgbaVisualComponent {}

export class Opacity extends Component {
  #value: number;

  get value(): number { return this.#value; }
  set value(value: number) {
    this.#value = value;
  }

  constructor(value: number = 1) {
    super();
    this.#value = value;
  }
}

export class FillColor extends RgbaVisualComponent {}
export class StrokeColor extends RgbaVisualComponent {}
export class TintTrack extends RgbaVisualComponent {}

export class OpacityTrack extends Component {
  #value: number;

  get value(): number { return this.#value; }
  set value(value: number) {
    this.#value = value;
  }

  constructor(value: number = 1) {
    super();
    this.#value = value;
  }
}
export class OpacityTransition extends Component {
  declare public from: number;
  declare public to: number;
  declare public durationMs: number;
  declare public elapsedMs: number;

  constructor(from: number = 1, to: number = 1, durationMs: number = 0, elapsedMs: number = 0) {
    super();
    this.from = from;
    this.to = to;
    this.durationMs = durationMs;
    this.elapsedMs = elapsedMs;
  }
}
