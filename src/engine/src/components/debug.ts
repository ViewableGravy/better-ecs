import { Component } from "@engine/ecs/component";
import { SerializableComponent, serializable } from "@engine/serialization";

@SerializableComponent
export class Debug extends Component {
  @serializable("string")
  declare public name: string;

  public createdAt: number;

  constructor(name: string) {
    super();
    this.name = name;
    this.createdAt = performance.now();
  }
}
