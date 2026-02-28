import type { KeyBind } from "@/systems/input/keybind";
import { EngineMouseEvent, type EngineInputHost, type EngineMouseEventName } from "@core/input/mouse";

export type EngineKeyboardEvent = {
  type: "key";
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  originalEvent: KeyboardEvent;
  preventDefault: () => void;
};

type MouseListenerEntry = {
  id: number;
  callback: (event: EngineMouseEvent) => void;
};

type KeyListenerEntry = {
  id: number;
  bind: KeyBind;
  callback: (event: EngineKeyboardEvent) => void;
};

type MouseListenerArgs = {
  event: EngineMouseEventName;
  callback: (event: EngineMouseEvent) => void;
};

type KeyListenerArgs = {
  event: KeyBind;
  callback: (event: EngineKeyboardEvent) => void;
};

type EngineInputOptions = {
  resolveCanvas: () => HTMLCanvasElement;
  getEngine: () => EngineInputHost;
};

const DEFAULT_MODIFIERS = {
  ctrl: false,
  shift: false,
  alt: false,
  meta: false,
} as const;

export class EngineInput {
  readonly #resolveCanvas: () => HTMLCanvasElement;
  readonly #getEngine: () => EngineInputHost;

  #nextId = 1;

  readonly #mouseListenersByEvent = new Map<EngineMouseEventName, MouseListenerEntry[]>();
  readonly #keyListeners: KeyListenerEntry[] = [];

  #isMouseDownAttached = false;
  #isMouseMoveAttached = false;
  #isMouseUpAttached = false;
  #isMouseCancelAttached = false;
  #isKeyDownAttached = false;

  readonly #onPointerDown = (event: PointerEvent): void => {
    this.#dispatchMouse("mouseDown", event);
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    this.#dispatchMouse("mouseMove", event);
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    this.#dispatchMouse("mouseUp", event);
  };

  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#dispatchMouse("mouseCancel", event);
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (this.#keyListeners.length === 0) {
      return;
    }

    for (const listener of this.#keyListeners) {
      if (!this.#matchesKeybind(event, listener.bind)) {
        continue;
      }

      listener.callback({
        type: "key",
        code: event.code,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        originalEvent: event,
        preventDefault: () => event.preventDefault(),
      });
    }
  };

  public constructor(options: EngineInputOptions) {
    this.#resolveCanvas = options.resolveCanvas;
    this.#getEngine = options.getEngine;
  }

  public addEventListener(args: MouseListenerArgs | KeyListenerArgs): () => void {
    const id = this.#nextId;
    this.#nextId += 1;

    if (typeof args.event === "string") {
      const list = this.#mouseListenersByEvent.get(args.event) ?? [];
      list.push({ id, callback: args.callback });
      this.#mouseListenersByEvent.set(args.event, list);
      this.#syncMouseNativeListeners();
      return () => this.#removeMouseListener(args.event, id);
    }

    this.#keyListeners.push({ id, bind: args.event, callback: args.callback });
    this.#syncKeyboardNativeListeners();
    return () => this.#removeKeyListener(id);
  }

  #removeMouseListener(event: EngineMouseEventName, id: number): void {
    const current = this.#mouseListenersByEvent.get(event);
    if (!current) {
      return;
    }

    const next = current.filter((listener) => listener.id !== id);
    if (next.length === 0) {
      this.#mouseListenersByEvent.delete(event);
    } else {
      this.#mouseListenersByEvent.set(event, next);
    }

    this.#syncMouseNativeListeners();
  }

  #removeKeyListener(id: number): void {
    const index = this.#keyListeners.findIndex((listener) => listener.id === id);
    if (index < 0) {
      return;
    }

    this.#keyListeners.splice(index, 1);
    this.#syncKeyboardNativeListeners();
  }

  #dispatchMouse(type: EngineMouseEventName, event: PointerEvent): void {
    const listeners = this.#mouseListenersByEvent.get(type);
    if (!listeners || listeners.length === 0) {
      return;
    }

    const engine = this.#getEngine();

    for (const listener of listeners) {
      listener.callback(new EngineMouseEvent(type, event, engine));
    }
  }

  #syncMouseNativeListeners(): void {
    const hasMouseDown = (this.#mouseListenersByEvent.get("mouseDown")?.length ?? 0) > 0;
    const hasMouseMove = (this.#mouseListenersByEvent.get("mouseMove")?.length ?? 0) > 0;
    const hasMouseUp = (this.#mouseListenersByEvent.get("mouseUp")?.length ?? 0) > 0;
    const hasMouseCancel = (this.#mouseListenersByEvent.get("mouseCancel")?.length ?? 0) > 0;

    const canvas = this.#resolveCanvas();
    if (hasMouseDown && !this.#isMouseDownAttached) {
      canvas.addEventListener("pointerdown", this.#onPointerDown);
      this.#isMouseDownAttached = true;
    }
    if (!hasMouseDown && this.#isMouseDownAttached) {
      canvas.removeEventListener("pointerdown", this.#onPointerDown);
      this.#isMouseDownAttached = false;
    }

    if (hasMouseMove && !this.#isMouseMoveAttached) {
      window.addEventListener("pointermove", this.#onPointerMove);
      this.#isMouseMoveAttached = true;
    }
    if (!hasMouseMove && this.#isMouseMoveAttached) {
      window.removeEventListener("pointermove", this.#onPointerMove);
      this.#isMouseMoveAttached = false;
    }

    if (hasMouseUp && !this.#isMouseUpAttached) {
      window.addEventListener("pointerup", this.#onPointerUp);
      this.#isMouseUpAttached = true;
    }
    if (!hasMouseUp && this.#isMouseUpAttached) {
      window.removeEventListener("pointerup", this.#onPointerUp);
      this.#isMouseUpAttached = false;
    }

    if (hasMouseCancel && !this.#isMouseCancelAttached) {
      window.addEventListener("pointercancel", this.#onPointerCancel);
      this.#isMouseCancelAttached = true;
    }
    if (!hasMouseCancel && this.#isMouseCancelAttached) {
      window.removeEventListener("pointercancel", this.#onPointerCancel);
      this.#isMouseCancelAttached = false;
    }
  }

  #syncKeyboardNativeListeners(): void {
    const hasListeners = this.#keyListeners.length > 0;

    if (hasListeners && !this.#isKeyDownAttached) {
      window.addEventListener("keydown", this.#onKeyDown);
      this.#isKeyDownAttached = true;
    }

    if (!hasListeners && this.#isKeyDownAttached) {
      window.removeEventListener("keydown", this.#onKeyDown);
      this.#isKeyDownAttached = false;
    }
  }

  #matchesKeybind(event: KeyboardEvent, bind: KeyBind): boolean {
    const expectedCtrl = bind.modifiers.ctrl ?? DEFAULT_MODIFIERS.ctrl;
    const expectedShift = bind.modifiers.shift ?? DEFAULT_MODIFIERS.shift;
    const expectedAlt = bind.modifiers.alt ?? DEFAULT_MODIFIERS.alt;
    const expectedMeta = bind.modifiers.meta ?? DEFAULT_MODIFIERS.meta;

    return event.code === bind.code
      && event.ctrlKey === expectedCtrl
      && event.shiftKey === expectedShift
      && event.altKey === expectedAlt
      && event.metaKey === expectedMeta;
  }
}

export { EngineMouseEvent, getEntityAtPoint } from "@core/input/mouse";
export type { EngineInputHost, EngineMouseEventName, EntityAtPointOptions, Point2D } from "@core/input/mouse";

