import { Serializable, serializable } from "@engine";

export class Placeable extends Serializable {
  @serializable("string")
  public itemType: string;

  public constructor(itemType: string) {
    super();
    this.itemType = itemType;
  }
}
