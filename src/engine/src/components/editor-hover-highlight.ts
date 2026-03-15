import { Component } from "@engine/ecs/component";
import { SerializableComponent, serializable } from "@engine/serialization";

@SerializableComponent
export class EditorHoverHighlight extends Component {
  @serializable("float")
  declare public amount: number;

  constructor(amount: number = 0.15) {
    super();
    this.amount = amount;
  }
}
