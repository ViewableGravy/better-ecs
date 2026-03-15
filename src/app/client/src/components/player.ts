import { Component, SerializableComponent, serializable } from "@engine";

export type PlayerDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type PlayerAnimationState = "idle" | "moving";

@SerializableComponent
export class PlayerComponent extends Component {
  @serializable("string")
  declare public name: string;

  @serializable("string")
  declare public direction: PlayerDirection;

  @serializable("string")
  declare public animationState: PlayerAnimationState;

  constructor(name: string, direction: PlayerDirection = "s", animationState: PlayerAnimationState = "idle") {
    super();
    this.name = name;
    this.direction = direction;
    this.animationState = animationState;
  }
}