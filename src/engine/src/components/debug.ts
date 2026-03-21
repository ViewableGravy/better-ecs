import { Component } from "@engine/ecs/component";
import { StateComponent, state } from "@engine/serialization";

@StateComponent
export class Debug extends Component {
  @state("string")
  declare public name: string;

  public createdAt: number;

  constructor(name: string) {
    super();
    this.name = name;
    this.createdAt = performance.now();
  }
}
