import { Component, StateComponent, state } from "@engine";

export type PlayerDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type PlayerAnimationState = "idle" | "moving";

@StateComponent
export class PlayerComponent extends Component {
  @state("string")
  declare public name: string;

  @state("string")
  declare public direction: PlayerDirection;

  @state("string")
  declare public animationState: PlayerAnimationState;

  constructor(name: string, direction: PlayerDirection = "s", animationState: PlayerAnimationState = "idle") {
    super();
    this.name = name;
    this.direction = direction;
    this.animationState = animationState;
  }
}