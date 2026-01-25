import { Pool } from "./pool";
export type KeyboardEventData = {
    type: "keydown" | "keyup";
    code: string;
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    release: () => void;
};
export declare class EventPool extends Pool<KeyboardEventData> {
    constructor();
    press(type: "keydown" | "keyup", code: string, ctrl: boolean, shift: boolean, alt: boolean, meta: boolean): Readonly<KeyboardEventData>;
}
//# sourceMappingURL=eventPool.d.ts.map