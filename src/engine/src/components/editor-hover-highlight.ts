import { Component } from "@engine/ecs/component";
export class EditorHoverHighlight extends Component {
  declare public amount: number;

  constructor(amount: number = 0.15) {
    super();
    this.amount = amount;
  }
}
