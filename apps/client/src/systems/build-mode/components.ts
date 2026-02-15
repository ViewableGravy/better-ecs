export class GridPosition {
  public constructor(
    public x: number,
    public y: number,
  ) {}
}

export class GridFootprint {
  public constructor(
    public width: number,
    public height: number,
  ) {}
}

export class Placeable {
  public constructor(public itemType: "box") {}
}

export class GhostPreview {}
