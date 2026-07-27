import { Component } from "@engine";

export type PlayerDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type PlayerAnimationState = "idle" | "moving";

export class PlayerComponent extends Component {
  public direction: PlayerDirection;
  public animationState: PlayerAnimationState;

  constructor(direction: PlayerDirection = "s", animationState: PlayerAnimationState = "idle") {
    super();
    this.direction = direction;
    this.animationState = animationState;
  }
}
