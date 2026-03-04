import type { BuildItemType } from "@client/systems/world/build-mode/const";

export class Placeable {
  public constructor(public itemType: BuildItemType) {}
}
