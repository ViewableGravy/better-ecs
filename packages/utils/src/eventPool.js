import { Pool } from "./pool";
export class EventPool extends Pool {
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
    press(type, code, ctrl, shift, alt, meta) {
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
//# sourceMappingURL=eventPool.js.map