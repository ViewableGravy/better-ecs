import { Pool } from "./pool";

type KeyboardEvent = {
  type: "keydown" | "keyup";
  key: string;
  release: () => void;
}

export class EventPool extends Pool<KeyboardEvent> {
  constructor() {
    super((pool) => ({
      type: "keydown",
      key: "",
      release() {
        pool.release(this);
      }
    }));
  }

  public press(type: "keydown" | "keyup", key: string): Readonly<KeyboardEvent> {
    const obj = this.acquire();
    obj.type = type;
    obj.key = key;
    return obj;
  }
}
