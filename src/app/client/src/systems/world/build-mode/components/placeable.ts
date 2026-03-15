import { Component, SerializableComponent, serializable } from "@engine";

@SerializableComponent
export class Placeable extends Component {
  @serializable("string")
  declare public itemType: string;

  public constructor(itemType: string) {
    super();
    this.itemType = itemType;
  }
}
