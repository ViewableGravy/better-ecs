import { Component } from "@engine";
export class Placeable extends Component {
  declare public itemType: string;

  public constructor(itemType: string) {
    super();
    this.itemType = itemType;
  }
}
