import { Component } from "@engine/ecs/component";
export class Debug extends Component {
  declare public name: string;

  public createdAt: number;

  constructor(name: string) {
    super();
    this.name = name;
    this.createdAt = performance.now();
  }
}
