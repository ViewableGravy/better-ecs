import { Component } from "@engine";

export type PlayerDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type PlayerAnimationState = "idle" | "moving";
export class PlayerComponent extends Component {
  declare public name: string;
  declare public direction: PlayerDirection;
  declare public animationState: PlayerAnimationState;

  constructor(name: string, direction: PlayerDirection = "s", animationState: PlayerAnimationState = "idle") {
    super();
    this.name = name;
    this.direction = direction;
    this.animationState = animationState;
  }
}