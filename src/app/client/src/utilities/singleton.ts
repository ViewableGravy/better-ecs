import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type SingletonConstructor<T extends Singleton> = {
  new (): T;
  instance?: T;
};

export abstract class Singleton {
  public static getInstance<T extends Singleton>(this: SingletonConstructor<T>): T {
    if (this.instance) {
      return this.instance;
    }

    const instance = new this();
    this.instance = instance;

    return instance;
  }

  public static instance<T extends Singleton>(this: SingletonConstructor<T>): T {
    invariant(this.instance, `Singleton instance of ${this.name} has not been initialized yet.`);
    return this.instance;
  }
}