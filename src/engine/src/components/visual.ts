import { Rgba } from "@engine/components/sprite/sprite";
import { Component } from "@engine/ecs/component";

export class Color extends Component {
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}
export class Tint extends Component {
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}
export class Opacity extends Component {
  declare public value: number;

  constructor(value: number = 1) {
    super();
    this.value = value;
  }
}
export class FillColor extends Component {
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}
export class StrokeColor extends Component {
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}
export class TintTrack extends Component {
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}
export class OpacityTrack extends Component {
  declare public value: number;

  constructor(value: number = 1) {
    super();
    this.value = value;
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
