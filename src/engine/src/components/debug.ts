import { Serializable, serializable } from "@engine/serialization";

export class Debug extends Serializable {
  @serializable("string")
  public name: string;

  public createdAt: number;

  constructor(name: string) {
    super();
    this.name = name;
    this.createdAt = performance.now();
  }
}
