import { Component, StateComponent, state } from "@engine";

@StateComponent
export class Placeable extends Component {
  @state("string")
  declare public itemType: string;

  public constructor(itemType: string) {
    super();
    this.itemType = itemType;
  }
}
