# 15 - Visual State Components Example

## Purpose

This document is a single-file proposal showing how visual state could be split into small composable components while keeping save, replication, dirty tracking, and render-only presentation concerns separate.

Nothing in this file is implemented yet.
The API shown below is illustrative and is meant to help evaluate the full shape before implementation.

## Core Idea

The model separates visual state into three layers:

1. authored or authoritative base values
2. authoritative modifiers that should save and/or replicate
3. presentation-only tracks that render can sample without mutating world state

That gives each visual value a stable meaning.
We do not change whether a field is serializable based on when it is written.
Instead, we place the value in the correct layer.

## Track Versus Transition

```ts
// These two concepts are intentionally different and should not be treated as
// duplicates that must always be kept in sync.
//
// OpacityTrack / TintTrack
//   - local presentation only
//   - not saved
//   - not replicated
//   - not dirty-tracked
//   - used for local hover, ghost feedback, editor emphasis, short flashes
//
// OpacityTransition
//   - authoritative transition state
//   - saved
//   - replicated
//   - dirty-tracked
//   - used when the transition itself is part of shared or resumable state
//
// Typical usage:
//   - attach Opacity only, if the entity just has a base authored opacity
//   - attach Opacity + OpacityTransition, if gameplay or save/load needs the
//     fade to continue consistently
//   - attach Opacity + OpacityTrack, if the entity needs a local visual overlay
//   - attach all three only when you explicitly want both:
//       authoritative base + authoritative transition + local presentation layer
//
// There is no generic sync system between Track and Transition because they do
// different jobs. They compose at resolve time instead.
```

## Policy Model

```ts
// Proposed policy metadata used by both persistence and networking.
//
// - save: include in world snapshots and hydration
// - replicate: include in networking diffs / replication streams
// - dirtyTracking: enqueue dirty events when written at runtime
//
// The exact API can change later, but the important part is that these are
// separate axes instead of one global "serializable or not" switch.
type StatePolicy = {
  save: boolean;
  replicate: boolean;
  dirtyTracking: boolean;
};

const AUTHORITATIVE: StatePolicy = {
  save: true,
  replicate: true,
  dirtyTracking: true,
};

const SAVE_ONLY: StatePolicy = {
  save: true,
  replicate: false,
  dirtyTracking: true,
};

const LOCAL_PRESENTATION: StatePolicy = {
  save: false,
  replicate: false,
  dirtyTracking: false,
};
```

## Value Types

```ts
// Small shared RGBA value object.
//
// This replaces Sprite-owned Color and becomes a general engine value type.
// It can be reused by Color, Tint, FillColor, StrokeColor, tracks, materials,
// and any later renderable that needs a color payload.
export class Rgba {
  constructor(
    public r: number = 1,
    public g: number = 1,
    public b: number = 1,
    public a: number = 1,
  ) {}

  public set(r: number, g: number, b: number, a: number = this.a): this {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this;
  }

  public copyFrom(other: Rgba): this {
    this.r = other.r;
    this.g = other.g;
    this.b = other.b;
    this.a = other.a;
    return this;
  }

  public clone(): Rgba {
    return new Rgba(this.r, this.g, this.b, this.a);
  }
}
```

## Authoritative Visual Components

```ts
// Proposed decorator names are illustrative.
//
// The important part is the metadata shape, not the exact spelling.
function StateComponent(options: { policy: StatePolicy }) {
  return function (_constructor: Function) {
    return;
  };
}

function state(type: "float" | "json", options?: { policy?: Partial<StatePolicy> }) {
  return function (_target: object, _propertyKey: string) {
    return;
  };
}

// Base color for renderables that have a single intrinsic color channel.
// Example consumers: text, shader quads, flat primitives, future UI glyphs.
@StateComponent({ policy: AUTHORITATIVE })
export class Color extends Component {
  @state("json")
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba(1, 1, 1, 1)) {
    super();
    this.value = value;
  }
}

// Multiplicative modifier.
// Example consumers: team colors, user customization, damage status.
@StateComponent({ policy: AUTHORITATIVE })
export class Tint extends Component {
  @state("json")
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba(1, 1, 1, 1)) {
    super();
    this.value = value;
  }
}

// Scalar visibility modifier.
// Example consumers: authored transparency, stealth gameplay, visibility state.
@StateComponent({ policy: AUTHORITATIVE })
export class Opacity extends Component {
  @state("float")
  declare public value: number;

  constructor(value: number = 1) {
    super();
    this.value = value;
  }
}

// Shape-specific base channels remain explicit.
//
// This is better than forcing one universal Color component onto shapes that
// legitimately have separate fill and stroke semantics.
@StateComponent({ policy: AUTHORITATIVE })
export class FillColor extends Component {
  @state("json")
  declare public value: Rgba;

  constructor(value: Rgba = new Rgba(1, 1, 1, 1)) {
    super();
    this.value = value;
  }
}

@StateComponent({ policy: AUTHORITATIVE })
export class StrokeColor extends Component {
  @state("json")
  declare public value: Rgba | null;

  constructor(value: Rgba | null = null) {
    super();
    this.value = value;
  }
}

// Entity-level state visibility / replication scope.
//
// This is the missing piece for cases like Transform2D:
// the component itself keeps one stable meaning, while the entity decides whether
// its state participates in save / replication / dirty tracking.
export type EntityStateScopeMode = "shared" | "owner-only" | "local-only";

@StateComponent({ policy: AUTHORITATIVE })
export class EntityStateScope extends Component {
  @state("json")
  declare public mode: EntityStateScopeMode;

  @state("json")
  declare public ownerId: string | null;

  constructor(mode: EntityStateScopeMode = "shared", ownerId: string | null = null) {
    super();
    this.mode = mode;
    this.ownerId = ownerId;
  }
}
```

## Presentation Track Components

```ts
// Presentation-only tracks are local by default.
//
// They are sampled by render or by a read-only render-preparation stage.
// They do not save, replicate, or generate dirty queue traffic unless a feature
// explicitly chooses an authoritative transition component instead.

export type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

@StateComponent({ policy: LOCAL_PRESENTATION })
export class TintTrack extends Component {
  @state("json")
  declare public from: Rgba;

  @state("json")
  declare public to: Rgba;

  @state("float")
  declare public elapsedMs: number;

  @state("float")
  declare public durationMs: number;

  @state("json")
  declare public easing: Easing;

  @state("float")
  declare public weight: number;

  constructor() {
    super();
    this.from = new Rgba(1, 1, 1, 1);
    this.to = new Rgba(1, 1, 1, 1);
    this.elapsedMs = 0;
    this.durationMs = 0;
    this.easing = "linear";
    this.weight = 1;
  }
}

@StateComponent({ policy: LOCAL_PRESENTATION })
export class OpacityTrack extends Component {
  @state("float")
  declare public from: number;

  @state("float")
  declare public to: number;

  @state("float")
  declare public elapsedMs: number;

  @state("float")
  declare public durationMs: number;

  @state("json")
  declare public easing: Easing;

  constructor() {
    super();
    this.from = 1;
    this.to = 1;
    this.elapsedMs = 0;
    this.durationMs = 0;
    this.easing = "linear";
  }
}

// If a fade or tint transition must be resumable after save/load or must be
// visible to other clients in progress, use a separate authoritative transition
// component instead of changing the meaning of the local presentation track.
@StateComponent({ policy: AUTHORITATIVE })
export class OpacityTransition extends Component {
  @state("float")
  declare public from: number;

  @state("float")
  declare public to: number;

  @state("float")
  declare public elapsedMs: number;

  @state("float")
  declare public durationMs: number;

  @state("json")
  declare public easing: Easing;

  constructor() {
    super();
    this.from = 1;
    this.to = 1;
    this.elapsedMs = 0;
    this.durationMs = 0;
    this.easing = "linear";
  }
}
```

## Entity Composition Examples

```ts
// Example: a sprite entity with base color, team tint, and opacity.
//
// Sprite is now about textured quad identity and layout only.
// Color/Tint/Opacity compose with it instead of being owned by it.
function spawnPlayer(world: World): EntityId {
  const entityId = world.create();

  world.add(entityId, new Transform2D(0, 0));
  world.add(entityId, new Sprite("player-idle"));

  // Base color used by the render resolver as the intrinsic color channel.
  world.add(entityId, new Color(new Rgba(1, 1, 1, 1)));

  // Team tint is authoritative because other clients should see it too.
  world.add(entityId, new Tint(new Rgba(0.35, 0.8, 1, 1)));

  // Base authored visibility.
  world.add(entityId, new Opacity(1));

  return entityId;
}

// Example: a shape entity with explicit fill and stroke channels.
function spawnMarker(world: World): EntityId {
  const entityId = world.create();

  world.add(entityId, new Transform2D(64, 64));
  world.add(entityId, new Shape("circle", 16, 16));

  world.add(entityId, new FillColor(new Rgba(1, 0.2, 0.7, 1)));
  world.add(entityId, new StrokeColor(new Rgba(1, 1, 1, 1)));
  world.add(entityId, new Opacity(0.75));

  return entityId;
}

// Example: local-only ghost preview.
//
// The preview uses local tracks instead of writing authoritative Tint/Opacity.
function spawnGhostPreview(world: World): EntityId {
  const entityId = world.create();

  // This one line explains why Transform2D should not save or replicate here
  // even though the same Transform2D on a player absolutely should.
  world.add(entityId, new EntityStateScope("local-only", "local-player"));

  world.add(entityId, new Transform2D(0, 0));
  world.add(entityId, new Sprite("belt-preview"));
  world.add(entityId, new Color(new Rgba(1, 1, 1, 1)));
  world.add(entityId, new Opacity(1));

  // These tracks are local presentation only.
  world.add(entityId, new TintTrack());
  world.add(entityId, new OpacityTrack());

  return entityId;
}

// Example: multiplayer-visible placement preview.
//
// If other clients should see the preview, this is no longer just a local ghost.
// It becomes an authoritative preview entity with authoritative transform and
// authoritative preview descriptor state.
//
// That means we should model it as a separate shared concept instead of trying
// to make one local ghost entity selectively serialize some fields but not
// others on the fly.
function spawnSharedPlacementPreview(world: World): EntityId {
  const entityId = world.create();

  // Shared preview seen by everyone.
  world.add(entityId, new EntityStateScope("shared"));

  world.add(entityId, new Transform2D(0, 0));
  world.add(entityId, new Sprite("belt-preview"));
  world.add(entityId, new Color(new Rgba(1, 1, 1, 1)));
  world.add(entityId, new Tint(new Rgba(1, 1, 1, 1)));
  world.add(entityId, new Opacity(0.7));

  // Example authoritative descriptor for shared build previews.
  world.add(entityId, new PlacementPreview("transport-belt", "horizontal-right", "player-2"));

  return entityId;
}

// Example: owner-only preview.
//
// Server-authoritative games often need exactly this shape.
// The preview exists in shared simulation so the server can validate it, but it
// is only distributed back to the owning player.
function spawnOwnerOnlyPlacementPreview(world: World, ownerId: string): EntityId {
  const entityId = world.create();

  world.add(entityId, new EntityStateScope("owner-only", ownerId));
  world.add(entityId, new Transform2D(0, 0));
  world.add(entityId, new Sprite("belt-preview"));
  world.add(entityId, new Color(new Rgba(1, 1, 1, 1)));
  world.add(entityId, new Opacity(0.7));
  world.add(entityId, new PlacementPreview("transport-belt", "horizontal-right", ownerId));

  return entityId;
}
```

## Engine Setup Example

```ts
// This example is aligned with the engine's current shape.
//
// Dirty tracking is engine-native today.
// Persistence and future replication should consume that engine-native data,
// similar to the existing state-sync persistence system.
export const createAppEngine = () => {
  return createEngine({
    rootElement,
    assetLoader: Loader,
    loading: createAppEngineLoadingOverlay(),
    initialization: Initialize,
    render: Render,
    scenes: [MainScene],
    config: {
      serialization: {
        enableDirtyQueue: true,
      },
    },
  });
};

// Current-reality note:
//
// - createEngine already knows about dirty tracking
// - persistence is currently layered on top through serializationSystem(...)
// - networking can fit the same pattern as another consumer of dirty commands
// - if no consumer drains commands, the queue will accumulate
```

## Persistence And Replication Consumers

```ts
// Persistence already looks like this in the repo.
export const PersistenceSystem = serializationSystem({
  name: "client:persistence",
  inputAdapter: new IndexedDbWorkerInputAdapter({
    databaseName: STORAGE_DATABASE_NAME,
    storeName: STORAGE_STORE_NAME,
    storageKey: STORAGE_KEY,
    onHydrate: (_sceneState, context) => {
      reconnectPersistedTransportBelts(context);
    },
  }),
  outputAdapter: new IndexedDbWorkerOutputAdapter({
    databaseName: STORAGE_DATABASE_NAME,
    storeName: STORAGE_STORE_NAME,
    storageKey: STORAGE_KEY,
    flushIntervalMs: 1000,
  }),
});

// Future replication can follow the same shape.
//
// The important part is that replication does not need to be hard-coded into
// createEngine itself. It can consume engine.serialization.peek/drain commands
// the same way persistence already does.
export const ReplicationSystem = serializationSystem({
  name: "client:replication",
  outputAdapter: new NetworkOutputAdapter({
    transport,
    authority: "server",
    filter: "replicate-enabled-fields-only",
  }),
});

// Scene registration stays close to how scenes work today.
export const Scene = createContextScene("MainScene")({
  systems: [
    Movement,
    VisualTrackSystem,
    PersistenceSystem,
    ReplicationSystem,
  ],
  contexts: [...],
});
```

## Concrete Scope Filtering Example

```ts
// This section answers the specific Transform2D question.
//
// We do not create LocalTransform2D or NetworkedTransform2D.
// Instead, Transform2D stays one component and the entity's scope determines
// whether consumers should include it.

function shouldSaveEntity(world: World, entityId: EntityId): boolean {
  const scope = world.get(entityId, EntityStateScope);

  if (!scope) {
    return true;
  }

  return scope.mode !== "local-only";
}

function shouldReplicateEntityToConnection(
  world: World,
  entityId: EntityId,
  connectionOwnerId: string,
): boolean {
  const scope = world.get(entityId, EntityStateScope);

  if (!scope) {
    return true;
  }

  if (scope.mode === "shared") {
    return true;
  }

  if (scope.mode === "owner-only") {
    return scope.ownerId === connectionOwnerId;
  }

  return false;
}

function shouldTrackEntityDirtyState(world: World, entityId: EntityId): boolean {
  const scope = world.get(entityId, EntityStateScope);

  if (!scope) {
    return true;
  }

  return scope.mode !== "local-only";
}
```

## Command Filtering Example

```ts
// Minimal consumer-side filter.
//
// This is the easiest first implementation path: the engine keeps producing diff
// commands, and save / replication consumers drop commands for local-only
// entities before writing them anywhere.
function filterCommandsForSave(engine: RegisteredEngine, commands: readonly DiffCommand[]): DiffCommand[] {
  return commands.filter((command) => {
    if (command.op === "create-entity" || command.op === "destroy-entity") {
      const world = engine.scene.context.getWorld(command.worldId);
      if (!world) {
        return false;
      }

      return shouldSaveEntity(world, command.entityId);
    }

    const world = engine.scene.context.getWorld(command.worldId);
    if (!world) {
      return false;
    }

    return shouldSaveEntity(world, command.entityId);
  });
}

// Better future optimization.
//
// Once the policy is stable, engine.serialization.recordFieldChange(...) and the
// structural mutation hooks can consult shouldTrackEntityDirtyState(...) before
// enqueueing commands at all, so local-only ghosts never enter the queue.
```

## Save And Hydration Example

```ts
// Save should include authoritative visual state.
//
// Example result:
// - Color / Tint / Opacity / FillColor / StrokeColor are saved
// - local TintTrack / OpacityTrack are skipped
// - entities with EntityStateScope("local-only") are skipped entirely
// - OpacityTransition is saved because it is authoritative and resumable
const snapshot = engine.persistence.serializeWorld(world);

// Later, hydration reconstructs the saved base state and any authoritative
// transitions that should resume.
const hydratedWorld = engine.persistence.hydrateWorld(snapshot);
```

## Networking Example

```ts
// Authoritative gameplay or user-visible changes write to authoritative
// components, which become dirty and replicate.
function applyTeamTint(world: World, entityId: EntityId, teamColor: Rgba): void {
  const tint = world.require(entityId, Tint);

  // Because Tint is authoritative, this write:
  // - updates world state
  // - marks the component dirty
  // - becomes eligible for replication
  // - becomes eligible for save snapshots
  tint.value = teamColor;
}

// Local UI feedback writes to presentation tracks, which do not replicate.
const SHARED_VALID_FROM = new Rgba(1, 1, 1, 0.7);
const SHARED_VALID_TO = new Rgba(1, 1, 1, 1);
const SHARED_INVALID_FROM = new Rgba(1, 0.45, 0.45, 0.7);
const SHARED_INVALID_TO = new Rgba(1, 0.2, 0.2, 1);

function flashPlacementPreview(world: World, entityId: EntityId, valid: boolean): void {
  const track = world.require(entityId, TintTrack);

  // Avoid hot-path allocations by reusing shared constants and copying into the
  // already-owned component payloads.
  track.from.copyFrom(valid ? SHARED_VALID_FROM : SHARED_INVALID_FROM);
  track.to.copyFrom(valid ? SHARED_VALID_TO : SHARED_INVALID_TO);
  track.elapsedMs = 0;
  track.durationMs = 120;
  track.easing = "ease-out";

  // Because TintTrack is local presentation only, this does not:
  // - save
  // - replicate
  // - enqueue dirty queue traffic
}

// Shared preview movement.
//
// Same Transform2D component, different entity scope.
// This movement replicates because the entity is shared or owner-only.
function moveSharedPreview(world: World, entityId: EntityId, x: number, y: number): void {
  const transform = world.require(entityId, Transform2D);
  mutate(transform, "curr", (curr) => {
    curr.pos.set(x, y);
  });
}

// Local ghost movement.
//
// Same Transform2D component, but EntityStateScope("local-only") causes save
// and replication consumers to ignore it.
function moveLocalGhost(world: World, entityId: EntityId, x: number, y: number): void {
  const transform = world.require(entityId, Transform2D);
  mutate(transform, "curr", (curr) => {
    curr.pos.set(x, y);
  });
}
```

## Update System Example

```ts
// Update owns advancing authoritative and local tracks.
//
// Render never mutates components. It only samples the prepared state.
export const VisualTrackSystem = createSystem("engine:visual-tracks")({
  phase: "update",
  system: Entrypoint,
});

function Entrypoint() {
  const world = useWorld();
  const [updateDeltaMs] = useDelta();

  for (const entityId of world.query(TintTrack)) {
    const track = world.require(entityId, TintTrack);
    track.elapsedMs = Math.min(track.elapsedMs + updateDeltaMs, track.durationMs);
  }

  for (const entityId of world.query(OpacityTrack)) {
    const track = world.require(entityId, OpacityTrack);
    track.elapsedMs = Math.min(track.elapsedMs + updateDeltaMs, track.durationMs);
  }

  for (const entityId of world.query(OpacityTransition, Opacity)) {
    const transition = world.require(entityId, OpacityTransition);
    const opacity = world.require(entityId, Opacity);

    transition.elapsedMs = Math.min(transition.elapsedMs + updateDeltaMs, transition.durationMs);

    // Authoritative transition resolves into authoritative target state.
    // This write is intentional and should save / replicate.
    opacity.value = sampleScalarTransition(transition);
  }
}
```

## Render Resolution Example

```ts
// Render composes the final visual value from whichever channels exist.
//
// The exact architecture could live in a render resolver, queue pass, or helper.
// The important part is that it reads only and never writes back to ECS.
type ResolvedSpriteVisual = {
  color: Rgba;
  opacity: number;
};

type ResolvedShapeVisual = {
  fill: Rgba;
  stroke: Rgba | null;
  opacity: number;
};

const SHARED_IDENTITY_COLOR = new Rgba(1, 1, 1, 1);
const SHARED_RESOLVED_SPRITE_VISUAL: ResolvedSpriteVisual = {
  color: new Rgba(1, 1, 1, 1),
  opacity: 1,
};
const SHARED_RESOLVED_SHAPE_VISUAL: ResolvedShapeVisual = {
  fill: new Rgba(1, 1, 1, 1),
  stroke: new Rgba(1, 1, 1, 1),
  opacity: 1,
};

function resolveSpriteVisualInto(
  world: World,
  entityId: EntityId,
  alpha: number,
  out: ResolvedSpriteVisual,
): ResolvedSpriteVisual {
  const baseColor = world.get(entityId, Color)?.value ?? SHARED_IDENTITY_COLOR;
  const tint = world.get(entityId, Tint)?.value ?? SHARED_IDENTITY_COLOR;
  const opacity = world.get(entityId, Opacity)?.value ?? 1;
  const tintTrack = world.get(entityId, TintTrack);
  const opacityTrack = world.get(entityId, OpacityTrack);

  const sampledTrackTint = tintTrack ? sampleColorTrack(tintTrack, alpha) : SHARED_IDENTITY_COLOR;
  const sampledTrackOpacity = opacityTrack ? sampleScalarTrack(opacityTrack, alpha) : 1;

  multiplyColorInto(baseColor, tint, sampledTrackTint, out.color);
  out.opacity = opacity * sampledTrackOpacity;
  return out;
}

function resolveShapeVisualInto(
  world: World,
  entityId: EntityId,
  alpha: number,
  out: ResolvedShapeVisual,
): ResolvedShapeVisual {
  const fill = world.get(entityId, FillColor)?.value ?? SHARED_IDENTITY_COLOR;
  const stroke = world.get(entityId, StrokeColor)?.value;
  const tint = world.get(entityId, Tint)?.value ?? SHARED_IDENTITY_COLOR;
  const opacity = world.get(entityId, Opacity)?.value ?? 1;
  const tintTrack = world.get(entityId, TintTrack);
  const opacityTrack = world.get(entityId, OpacityTrack);

  const sampledTrackTint = tintTrack ? sampleColorTrack(tintTrack, alpha) : SHARED_IDENTITY_COLOR;
  const sampledTrackOpacity = opacityTrack ? sampleScalarTrack(opacityTrack, alpha) : 1;

  multiplyColorInto(fill, tint, sampledTrackTint, out.fill);

  if (stroke) {
    if (!out.stroke) {
      out.stroke = new Rgba(1, 1, 1, 1);
    }
    multiplyColorInto(stroke, tint, sampledTrackTint, out.stroke);
  } else {
    out.stroke = null;
  }

  out.opacity = opacity * sampledTrackOpacity;
  return out;
}

// Example use in render code:
//
// const spriteVisual = resolveSpriteVisualInto(world, entityId, alpha, SHARED_RESOLVED_SPRITE_VISUAL);
// const shapeVisual = resolveShapeVisualInto(world, entityId, alpha, SHARED_RESOLVED_SHAPE_VISUAL);
```

## Example Gameplay And Presentation Flows

```ts
// 1. Team change
//
// - write Tint
// - save
// - replicate
// - dirty queue receives update
world.require(playerEntityId, Tint).value = new Rgba(0.15, 0.7, 1, 1);

// 2. Local hover flash
//
// - write TintTrack
// - do not save
// - do not replicate
// - do not dirty-track
startHoverFlash(world, hoveredEntityId);

// 3. Authored transparent window
//
// - write Opacity once at spawn or authoring time
// - save
// - optionally replicate if it matters to all players
world.add(windowEntityId, new Opacity(0.35));

// 4. Gameplay fade door that must resume after load and stay in sync
//
// - attach OpacityTransition
// - save
// - replicate
// - update system resolves it into Opacity each tick
world.add(doorEntityId, new OpacityTransition());
```

## Local Versus Shared Preview Rule

```ts
// This is the rule that avoids needing LocalTransform2D / NetworkedTransform2D
// variants for every component type.
//
// If the preview is local-only, mark the entity local-only and let consumers
// skip the whole entity.
//
// If the preview is shared with other clients, mark it shared or owner-only and
// use the same normal Transform2D / Tint / Opacity components.
//
// In other words:
//   preview visibility scope changes entity inclusion policy,
//   not the meaning of Transform2D itself.
```

## What This Solves

```ts
// Saving world
//   Authoritative visual state saves cleanly.
//
// Networking
//   Only replicate-enabled fields produce network diffs.
//
// Visual-only animation
//   TintTrack / OpacityTrack provide local effects without dirty-queue churn.
//
// Hydration
//   Saved authoritative values restore base appearance on startup.
//
// Gameplay-visible visual changes
//   Team tint, user-selected tint, stealth opacity, and similar state stay
//   authoritative instead of being hidden inside local presentation logic.
```

## Current Intent For Later Implementation

```ts
// Implementation direction implied by this document:
//
// 1. Move Color out of Sprite and make it a general value/component concept.
// 2. Add Color, Tint, Opacity, FillColor, and StrokeColor as separate components.
// 3. Add track-based presentation state for color and opacity.
// 4. Separate save / replicate / dirtyTracking policy metadata.
// 5. Keep render read-only and make it resolve final output from composed state.
// 6. Avoid silent writes as the default design tool; prefer correct ownership.
```