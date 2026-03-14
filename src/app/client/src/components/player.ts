export type PlayerDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type PlayerAnimationState = "idle" | "moving";

export class PlayerComponent {
  constructor(
    public name: string,
    public direction: PlayerDirection = "s",
    public animationState: PlayerAnimationState = "idle",
  ) {}
}