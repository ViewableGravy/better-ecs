import type { EntityId } from "@engine/ecs/entity";
import type { Registry } from "@engine/ecs/registry";
import type { InstancedBucket } from "@engine/render/renderers/webGL/instanced-bucket";
import type { ShapeRenderInput } from "@engine/render/types/low-level";

/**
 * The kind of render command stored in {@link RenderQueue}.
 */
export type RenderCommandType =
  | "retained-sprite-bucket"
  | "shader-entity"
  | "text-entity"
  | "shape-entity"
  | "shape-draw"
  | "instanced-bucket";

export type RenderCommandScope = "gameplay" | "overlay";

export type RenderCommandBucketKind = "sprite" | "shader" | "text" | "shape" | "overlay-shape";

type RenderCommandBucket = {
  readonly key: string;
  readonly scope: RenderCommandScope;
  readonly layer: number;
  readonly subLayer: number;
  readonly kind: RenderCommandBucketKind;
  readonly commands: RenderCommand[];
};

export type QueuedRenderBucket = RenderCommandBucket;

type RenderBucketGroup = {
  readonly bucketsByKey: Map<string, RenderCommandBucket>;
};

type RenderSubLayerBucket = {
  readonly groups: Record<RenderCommandBucketKind, RenderBucketGroup>;
};

type RenderLayerBucket = {
  readonly orderedSubLayers: number[];
  readonly subLayers: Map<number, RenderSubLayerBucket>;
};

type RenderScopeBuckets = {
  readonly orderedLayers: number[];
  readonly layers: Map<number, RenderLayerBucket>;
};

const RENDER_SCOPE_ORDER: readonly RenderCommandScope[] = ["gameplay", "overlay"];
const RENDER_SCOPE_PRIORITY: Record<RenderCommandScope, number> = {
  gameplay: 0,
  overlay: 1,
};
const RENDER_BUCKET_KIND_PRIORITY: Record<RenderCommandBucketKind, number> = {
  sprite: 0,
  shader: 1,
  text: 2,
  shape: 3,
  "overlay-shape": 4,
};

/**
 * A single render command entry.
 */
export type RenderCommand = {
  type: RenderCommandType;
  registry: Registry | null;
  entityId: EntityId | null;
  shape: ShapeRenderInput | null;
  retainedSpriteBucketId?: number;
  instancedBucket?: InstancedBucket;
  instancedBucketExtra?: Record<string, number | Iterable<number>>;
  scope: RenderCommandScope;
  bucketKind: RenderCommandBucketKind;
  bucketKey: string;
  layer: number;
  zOrder: number;
};

/**
 * A queue of render commands for the current frame.
 * Commands are pushed directly into fixed bucket structures and then iterated in
 * explicit scope/layer/sub-layer/bucket order.
 */
export class RenderQueue {
  readonly #orderedCommands: RenderCommand[] = [];
  readonly #orderedBuckets: RenderCommandBucket[] = [];
  readonly #scopes = new Map<RenderCommandScope, RenderScopeBuckets>();
  #commandsDirty = false;

  constructor() {
    for (const scope of RENDER_SCOPE_ORDER) {
      this.#scopes.set(scope, createRenderScopeBuckets());
    }
  }

  get commands(): readonly RenderCommand[] {
    this.#rebuildOrderedCommandsIfNeeded();
    return this.#orderedCommands;
  }

  get buckets(): readonly QueuedRenderBucket[] {
    return this.#orderedBuckets;
  }

  /**
   * Add a command to the queue while preserving stable insertion order.
   */
  add(command: RenderCommand): void {
    const scope = this.#resolveScopeBuckets(command.scope);
    const layer = resolveOrCreateLayerBucket(scope, command.layer);
    const subLayer = resolveOrCreateSubLayerBucket(layer, command.zOrder);
    const group = subLayer.groups[command.bucketKind];
    const bucket = this.#resolveOrCreateRenderBucket(group, command);

    bucket.commands.push(command);
    this.#commandsDirty = true;
  }

  /**
   * Clear all commands.
   */
  clear(): void {
    this.#orderedCommands.length = 0;
    this.#orderedBuckets.length = 0;

    for (const scope of this.#scopes.values()) {
      scope.orderedLayers.length = 0;
      scope.layers.clear();
    }

    this.#commandsDirty = false;
  }

  #rebuildOrderedCommandsIfNeeded(): void {
    if (!this.#commandsDirty) {
      return;
    }

    const orderedCommands = this.#orderedCommands;
    const orderedBuckets = this.#orderedBuckets;

    orderedCommands.length = 0;

    for (const bucket of orderedBuckets) {
      for (const command of bucket.commands) {
        orderedCommands.push(command);
      }
    }

    this.#commandsDirty = false;
  }

  #resolveScopeBuckets(scope: RenderCommandScope): RenderScopeBuckets {
    const resolved = this.#scopes.get(scope);
    if (resolved) {
      return resolved;
    }

    const created = createRenderScopeBuckets();
    this.#scopes.set(scope, created);
    return created;
  }

  #resolveOrCreateRenderBucket(
    group: RenderBucketGroup,
    command: RenderCommand,
  ): RenderCommandBucket {
    const existing = group.bucketsByKey.get(command.bucketKey);
    if (existing) {
      return existing;
    }

    const created: RenderCommandBucket = {
      key: command.bucketKey,
      scope: command.scope,
      layer: command.layer,
      subLayer: command.zOrder,
      kind: command.bucketKind,
      commands: [],
    };

    group.bucketsByKey.set(command.bucketKey, created);
    insertRenderBucket(this.#orderedBuckets, created);
    return created;
  }
}

function createRenderScopeBuckets(): RenderScopeBuckets {
  return {
    orderedLayers: [],
    layers: new Map<number, RenderLayerBucket>(),
  };
}

function createRenderLayerBucket(): RenderLayerBucket {
  return {
    orderedSubLayers: [],
    subLayers: new Map<number, RenderSubLayerBucket>(),
  };
}

function createRenderSubLayerBucket(): RenderSubLayerBucket {
  return {
    groups: {
      sprite: createRenderBucketGroup(),
      shader: createRenderBucketGroup(),
      text: createRenderBucketGroup(),
      shape: createRenderBucketGroup(),
      "overlay-shape": createRenderBucketGroup(),
    },
  };
}

function createRenderBucketGroup(): RenderBucketGroup {
  return {
    bucketsByKey: new Map<string, RenderCommandBucket>(),
  };
}

function resolveOrCreateLayerBucket(scope: RenderScopeBuckets, layerKey: number): RenderLayerBucket {
  const existing = scope.layers.get(layerKey);
  if (existing) {
    return existing;
  }

  const created = createRenderLayerBucket();
  scope.layers.set(layerKey, created);
  insertNumericKey(scope.orderedLayers, layerKey);
  return created;
}

function resolveOrCreateSubLayerBucket(layer: RenderLayerBucket, subLayerKey: number): RenderSubLayerBucket {
  const existing = layer.subLayers.get(subLayerKey);
  if (existing) {
    return existing;
  }

  const created = createRenderSubLayerBucket();
  layer.subLayers.set(subLayerKey, created);
  insertNumericKey(layer.orderedSubLayers, subLayerKey);
  return created;
}

function insertNumericKey(target: number[], key: number): void {
  let index = 0;

  while (index < target.length && target[index] < key) {
    index += 1;
  }

  target.splice(index, 0, key);
}

function insertRenderBucket(target: RenderCommandBucket[], bucket: RenderCommandBucket): void {
  let index = 0;

  while (index < target.length) {
    const existing = target[index];
    if (!existing) {
      break;
    }

    if (compareRenderBuckets(existing, bucket) > 0) {
      break;
    }

    index += 1;
  }

  target.splice(index, 0, bucket);
}

function compareRenderBuckets(left: RenderCommandBucket, right: RenderCommandBucket): number {
  const scopeDelta = RENDER_SCOPE_PRIORITY[left.scope] - RENDER_SCOPE_PRIORITY[right.scope];
  if (scopeDelta !== 0) {
    return scopeDelta;
  }

  if (left.layer !== right.layer) {
    return left.layer - right.layer;
  }

  if (left.subLayer !== right.subLayer) {
    return left.subLayer - right.subLayer;
  }

  return RENDER_BUCKET_KIND_PRIORITY[left.kind] - RENDER_BUCKET_KIND_PRIORITY[right.kind];
}
