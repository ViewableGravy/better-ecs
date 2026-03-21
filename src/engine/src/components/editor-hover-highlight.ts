import { Component } from "@engine/ecs/component";
import { StateComponent, state } from "@engine/serialization";

@StateComponent
export class EditorHoverHighlight extends Component {
  @state("float")
  declare public amount: number;

  constructor(amount: number = 0.15) {
    super();
    this.amount = amount;
  }
}
