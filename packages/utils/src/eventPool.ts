import { Pool } from "./pool";

export type KeyboardEventData = {
  type: "keydown" | "keyup";
  code: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  release: () => void;
}

export class EventPool extends Pool<KeyboardEventData> {
  constructor() {
    super((pool) => ({
      type: "keydown",
      code: "",
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      release() {
        pool.release(this);
      }
    }));
  }

  public press(type: "keydown" | "keyup", code: string, ctrl: boolean, shift: boolean, alt: boolean, meta: boolean): Readonly<KeyboardEventData> {
    const obj = this.acquire();
    obj.type = type;
    obj.code = code;
    obj.ctrl = ctrl;
    obj.shift = shift;
    obj.alt = alt;
    obj.meta = meta;
    return obj;
  }
}
