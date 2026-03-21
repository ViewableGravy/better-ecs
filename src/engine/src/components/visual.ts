import { Rgba } from "@engine/components/sprite/sprite";
import { Component } from "@engine/ecs/component";
import { StateComponent, state } from "@engine/serialization";

export type EntityStateScopeValue = "shared" | "owner-only" | "local-only";

@StateComponent
export class Color extends Component {
  @state("json")
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}

@StateComponent
export class Tint extends Component {
  @state("json")
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}

@StateComponent
export class Opacity extends Component {
  @state("float")
  declare public value: number;

  constructor(value: number = 1) {
    super();
    this.value = value;
  }
}

@StateComponent
export class FillColor extends Component {
  @state("json")
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}

@StateComponent
export class StrokeColor extends Component {
  @state("json")
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}

@StateComponent({ policy: { save: false, replicate: false, dirtyTracking: false } })
export class TintTrack extends Component {
  @state("json", { policy: { save: false, replicate: false, dirtyTracking: false } })
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba()) {
    super();
    this.value = value;
  }
}

@StateComponent({ policy: { save: false, replicate: false, dirtyTracking: false } })
export class OpacityTrack extends Component {
  @state("float", { policy: { save: false, replicate: false, dirtyTracking: false } })
  declare public value: number;

  constructor(value: number = 1) {
    super();
    this.value = value;
  }
}

@StateComponent
export class OpacityTransition extends Component {
  @state("float")
  declare public from: number;

  @state("float")
  declare public to: number;

  @state("float")
  declare public durationMs: number;

  @state("float")
  declare public elapsedMs: number;

  constructor(from: number = 1, to: number = 1, durationMs: number = 0, elapsedMs: number = 0) {
    super();
    this.from = from;
    this.to = to;
    this.durationMs = durationMs;
    this.elapsedMs = elapsedMs;
  }
}

@StateComponent
export class EntityStateScope extends Component {
  @state("string")
  declare public value: EntityStateScopeValue;

  constructor(value: EntityStateScopeValue = "shared") {
    super();
    this.value = value;
  }
}