import { Serializable, serializable } from "@engine/serialization";

export class EditorHoverHighlight extends Serializable {
  @serializable("float")
  public amount: number;

  constructor(amount: number = 0.15) {
    super();
    this.amount = amount;
  }
}
