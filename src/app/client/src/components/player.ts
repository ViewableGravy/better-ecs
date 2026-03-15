import { Serializable, serializable } from "@engine";

export type PlayerDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type PlayerAnimationState = "idle" | "moving";

export class PlayerComponent extends Serializable {
  @serializable("string")
  public name: string;

  @serializable("string")
  public direction: PlayerDirection;

  @serializable("string")
  public animationState: PlayerAnimationState;

  constructor(name: string, direction: PlayerDirection = "s", animationState: PlayerAnimationState = "idle") {
    super();
    this.name = name;
    this.direction = direction;
    this.animationState = animationState;
  }
}