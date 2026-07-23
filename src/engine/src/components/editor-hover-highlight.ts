import { Component } from "@engine/ecs/component";
export class EditorHoverHighlight extends Component {
  #amount: number;

  get amount(): number {
    return this.#amount;
  }

  set amount(value: number) {
    if (this.#amount === value) {
      return;
    }

    this.#amount = value;
    this.__markChanged();
  }

  constructor(amount: number = 0.15) {
    super();
    this.#amount = amount;
  }
}
