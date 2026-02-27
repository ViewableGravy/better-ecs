import { Transform2D } from "../../components";
import { resolveActiveCameraViewFromEngine } from "../../components/camera-utils";
import type { EntityId } from "../../ecs/entity";
import { resolveWorldTransform2D } from "../../ecs/hierarchy";
import type { UserWorld } from "../../ecs/world";
import type { KeyBind } from "../../systems/input/keybind";

export type EngineMouseEventName = "mouseDown" | "mouseMove" | "mouseUp" | "mouseCancel";

type EngineInputHost = {
  canvas: HTMLCanvasElement;
  scene: {
    world: UserWorld;
  };
  editor: {
    camera: {
      mode: "world" | "engine";
      x: number;
      y: number;
      zoom: number;
    };
  };
};

type WorldPoint = {
  x: number;
  y: number;
};

const SHARED_TRANSFORM2D = new Transform2D();

export class EngineMouseEvent {
  readonly #type: EngineMouseEventName;
  readonly #event: PointerEvent;
  readonly #engine: EngineInputHost;

  #worldPoint: WorldPoint | null = null;

  public constructor(type: EngineMouseEventName, event: PointerEvent, engine: EngineInputHost) {
    this.#type = type;
    this.#event = event;
    this.#engine = engine;
  }

  public get type(): EngineMouseEventName {
    return this.#type;
  }

  public get pointerId(): number {
    return this.#event.pointerId;
  }

  public get button(): number {
    return this.#event.button;
  }

  public get altKey(): boolean {
    return this.#event.altKey;
  }

  public get ctrlKey(): boolean {
    return this.#event.ctrlKey;
  }

  public get shiftKey(): boolean {
    return this.#event.shiftKey;
  }

  public get metaKey(): boolean {
    return this.#event.metaKey;
  }

  public get mouseX(): number {
    const rect = this.#engine.canvas.getBoundingClientRect();
    return this.#event.clientX - rect.left;
  }

  public get mouseY(): number {
    const rect = this.#engine.canvas.getBoundingClientRect();
    return this.#event.clientY - rect.top;
  }

  public get worldX(): number {
    return this.#getWorldPoint().x;
  }

  public get worldY(): number {
    return this.#getWorldPoint().y;
  }

  public get originalEvent(): PointerEvent {
    return this.#event;
  }

  public preventDefault(): void {
    this.#event.preventDefault();
  }

  public entityAtPoint(maxDistancePixels: number, world: UserWorld = this.#engine.scene.world): EntityId | null {
    return getEntityAtPoint(
      this.#engine,
      world,
      {
        x: this.worldX,
        y: this.worldY,
      },
      maxDistancePixels,
    );
  }

  #getWorldPoint(): WorldPoint {
    const cached = this.#worldPoint;
    if (cached) {
      return cached;
    }

    const rect = this.#engine.canvas.getBoundingClientRect();
    const cameraView = resolveActiveCameraViewFromEngine(this.#engine, this.#engine.scene.world);
    const worldX = (this.#event.clientX - rect.left - rect.width / 2) / cameraView.zoom + cameraView.x;
    const worldY = (this.#event.clientY - rect.top - rect.height / 2) / cameraView.zoom + cameraView.y;

    const next = {
      x: worldX,
      y: worldY,
    };
    this.#worldPoint = next;
    return next;
  }
}

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

export function getEntityAtPoint(
  engine: EngineInputHost,
  world: UserWorld,
  point: WorldPoint,
  maxDistancePixels: number,
): EntityId | null {
  if (maxDistancePixels <= 0) {
    return null;
  }

  const cameraView = resolveActiveCameraViewFromEngine(engine, world);
  const maxDistanceWorld = maxDistancePixels / cameraView.zoom;
  const maxDistanceSquared = maxDistanceWorld * maxDistanceWorld;

  let nearestEntityId: EntityId | null = null;
  let nearestDistanceSquared = maxDistanceSquared;

  for (const entityId of world.query(Transform2D)) {
    if (!resolveWorldTransform2D(world, entityId, SHARED_TRANSFORM2D)) {
      continue;
    }

    const deltaX = SHARED_TRANSFORM2D.curr.pos.x - point.x;
    const deltaY = SHARED_TRANSFORM2D.curr.pos.y - point.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared > nearestDistanceSquared) {
      continue;
    }

    nearestDistanceSquared = distanceSquared;
    nearestEntityId = entityId;
  }

  return nearestEntityId;
}