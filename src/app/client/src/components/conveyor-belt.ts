export const DEFAULT_CONVEYOR_BELT_SPEED = 35;

export class ConveyorBeltComponent {
  constructor(
    public variant: string,
    public speed = DEFAULT_CONVEYOR_BELT_SPEED,
  ) {}
}
