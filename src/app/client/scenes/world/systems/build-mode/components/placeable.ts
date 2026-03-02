import type { BuildItemType } from "@client/scenes/world/systems/build-mode/const";

export class Placeable {
  public constructor(public itemType: BuildItemType) {}
}
