export class Debug {
  public name: string;
  public createdAt: number;

  constructor(name: string) {
    this.name = name;
    this.createdAt = performance.now();
  }
}
