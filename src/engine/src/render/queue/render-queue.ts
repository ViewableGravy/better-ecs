import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";
import type { ShapeRenderInput } from "@engine/render/types/low-level";

/**
 * The kind of render command stored in {@link RenderQueue}.
 */
export type RenderCommandType = "sprite-entity" | "shader-entity" | "shape-entity" | "shape-draw";

export type RenderCommandScope = "gameplay" | "overlay";

export type RenderCommandBucketKind = "sprite" | "shader" | "shape" | "overlay-shape";

type RenderCommandBucket = {
  readonly key: string;
  readonly commands: RenderCommand[];
};

type RenderBucketGroup = {
  readonly bucketsByKey: Map<string, RenderCommandBucket>;
  readonly orderedBuckets: RenderCommandBucket[];
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
const RENDER_BUCKET_KIND_ORDER: readonly RenderCommandBucketKind[] = ["sprite", "shader", "shape", "overlay-shape"];

/**
 * A single render command entry.
 */
export type RenderCommand = {
  type: RenderCommandType;
  world: UserWorld | null;
  entityId: EntityId | null;
  shape: ShapeRenderInput | null;
  spriteRecordIndex?: number;
  scope: RenderCommandScope;
  bucketKind: RenderCommandBucketKind;
  bucketKey: string;
  layer: number;
  zOrder: number;
  sequence: number;
};

/**
 * A queue of render commands for the current frame.
 * Commands are pushed directly into fixed bucket structures and then iterated in
 * explicit scope/layer/sub-layer/bucket order.
 */
export class RenderQueue {
  #nextSequence = 0;
  readonly #orderedCommands: RenderCommand[] = [];
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

  /**
   * Add a command to the queue while preserving stable insertion order.
   */
  add(command: RenderCommand): void {
    command.sequence = this.#nextSequence;
    this.#nextSequence += 1;

    const scope = this.#resolveScopeBuckets(command.scope);
    const layer = resolveOrCreateLayerBucket(scope, command.layer);
    const subLayer = resolveOrCreateSubLayerBucket(layer, command.zOrder);
    const group = subLayer.groups[command.bucketKind];
    const bucket = resolveOrCreateRenderBucket(group, command.bucketKey);

    bucket.commands.push(command);
    this.#commandsDirty = true;
  }

  /**
   * Maintain the public API shape for existing callers while materializing the
   * ordered command view from bucketed storage.
   */
  sortByLayer(): void {
    this.#rebuildOrderedCommandsIfNeeded();
  }

  forEachCommand(visitor: (command: RenderCommand) => void): void {
    for (const scopeName of RENDER_SCOPE_ORDER) {
      const scope = this.#resolveScopeBuckets(scopeName);

      for (const layerKey of scope.orderedLayers) {
        const layer = scope.layers.get(layerKey);
        if (!layer) {
          continue;
        }

        for (const subLayerKey of layer.orderedSubLayers) {
          const subLayer = layer.subLayers.get(subLayerKey);
          if (!subLayer) {
            continue;
          }

          for (const bucketKind of RENDER_BUCKET_KIND_ORDER) {
            const group = subLayer.groups[bucketKind];

            for (const bucket of group.orderedBuckets) {
              for (const command of bucket.commands) {
                visitor(command);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Clear all commands.
   */
  clear(): void {
    this.#orderedCommands.length = 0;

    for (const scope of this.#scopes.values()) {
      scope.orderedLayers.length = 0;
      scope.layers.clear();
    }

    this.#nextSequence = 0;
    this.#commandsDirty = false;
  }

  #rebuildOrderedCommandsIfNeeded(): void {
    if (!this.#commandsDirty) {
      return;
    }

    this.#orderedCommands.length = 0;
    this.forEachCommand((command) => {
      this.#orderedCommands.push(command);
    });

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
      shape: createRenderBucketGroup(),
      "overlay-shape": createRenderBucketGroup(),
    },
  };
}

function createRenderBucketGroup(): RenderBucketGroup {
  return {
    bucketsByKey: new Map<string, RenderCommandBucket>(),
    orderedBuckets: [],
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

function resolveOrCreateRenderBucket(group: RenderBucketGroup, bucketKey: string): RenderCommandBucket {
  const existing = group.bucketsByKey.get(bucketKey);
  if (existing) {
    return existing;
  }

  const created: RenderCommandBucket = {
    key: bucketKey,
    commands: [],
  };

  group.bucketsByKey.set(bucketKey, created);
  group.orderedBuckets.push(created);
  return created;
}

function insertNumericKey(target: number[], key: number): void {
  let index = 0;

  while (index < target.length && target[index] < key) {
    index += 1;
  }

  target.splice(index, 0, key);
}
