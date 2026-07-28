# Conveyor / Item Transport System — Design Notes

Purpose
- Record assessment of a component-based conveyor system for the `better-ecs` engine.
- Capture architectural fit, risks, engine vs game responsibilities, edge cases, tick compatibility, performance concerns, and concrete recommendations.

Context (engine summary)
- ECS with opaque `EntityId`, sparse-set `ComponentStore<T>` for cache-friendly dense iteration.
- `World.query(...)` returns intersection of component sets; iteration order depends on store density and insertion history.
- Engine provides update/render phases and `transformSnapshot` for interpolation (fixed `ups`, higher `fps`).
- No spatial index or deterministic `querySorted` API currently.

High-level approach being evaluated
- Conveyors are behavior via components, not special tiles.
- Example components (game-level):
  - `GridPosition { x, y }`
  - `Direction { facing }`
  - `ItemBuffer { items[], capacity }`
  - `Conveyor { speed | ticksPerMove }`
- Any entity with the right components participates in item flow.

Assessment — Summary
- Verdict: **Good fit (with caveats)**
  - Component composition maps cleanly to ECS style.
  - Sparse-set iteration is cache-friendly for many conveyor entities.
  - Critical missing pieces in the engine: spatial indexing and deterministic iteration.

Engine vs Game Responsibilities

Engine (should provide)
- Spatial indexing / grid mapping (O(1) position→entity lookup).
- Deterministic query iteration or `querySorted` / `queryInto` helper.
- Low-level primitives and validation helpers (e.g. `canAcceptItem(destId)` utility).
- Optional: event hooks or registration for position changes so spatial index stays consistent.

Game / User land (belongs to game code)
- `GridPosition`, `Direction`, `ItemBuffer`, `Conveyor` components and rules.
- Conveyor-specific logic: throughput, splitters, mergers, filters, priorities.
- Visual conventions and animations (render-only components and Sprite/Renderable data).

Edge Cases & Handling

- Conveyor loops (A → B → C → A)
  - Status: requires explicit handling. Use pull-based transfer or two-phase commit.
  - Recommendation: plan transfers first, then execute; or use deterministic ordering with pull semantics.

- Multiple conveyors targeting same destination
  - Status: problematic without arbitration.
  - Recommendation: deterministic iteration + destination admission policy (first-come, round-robin, priority).

- Long chains & performance
  - Status: OK if O(1) neighbor lookups via spatial index; otherwise O(n²) blowup.
  - Recommendation: implement `SpatialGrid` before scaling tests.

- Insertion order / fairness
  - Status: unpredictable with current `query()` ordering.
  - Recommendation: `querySorted` by `EntityId` or explicit priority fields on conveyors.

- Backpressure (buffers full)
  - Naturally handled: check capacity; do not move items if destination full.
  - Consider visualization flags (`Blocked`) for UX.

- Items stuck due to direction mismatch
  - Naturally handled: transfer fails; item persists in source buffer.

- Hot-swapping conveyors
  - Naturally handled if spatial index and component lifecycle hooks are kept in sync.
  - Ensure removals clean the spatial index.

- Partial ticks / rollback / deterministic replay
  - Engine supports fixed update ticks; conveyors should be modeled as discrete tick movements.
  - Rollback not implemented; if needed, add authoritative server validation and compact logs of transfers.

Tick Model Compatibility
- Engine: `ups` (updates per second) is the authoritative tick rate; render is interpolated.
- Recommendation: keep conveyor movement discrete in `update` phase and use interpolated visuals for smooth sliding.
- Speed: belongs on `Conveyor` (ticksPerMove or speed in terms of updates). Do not put speed on items.
- Transfer model: prefer **pull-based** (destination pulls from neighbor) to avoid race conditions; if complicated, use two-phase planning/execution.

Data-Oriented Concerns
- Iterating conveyors using sparse-set is cache-friendly.
- Neighbor lookup must be O(1) (spatial index) or it dominates runtime.
- Grouping conveyors by component sets is sufficient for most cases; archetype-like grouping could help for many specialized belt types.
- Graph abstractions are not necessary and would fight the ECS pattern; prefer an indexed grid abstraction.

Rendering Separation
- Current render system reads `Transform` only and interpolates using `prev` and `curr` — good separation.
- Do not infer behavior from textures or sprites. Render should be a pure consumer of state (`Transform`, `Sprite`, and optional `Blocked`/`Load` indicators).

Alternative Designs (when to consider)
- Tile-based grid world (grid of `GridCell`) — simpler neighbor lookup, less flexible; good when map layout is static.
- Chunk-level simulation — good for very large maps with local updates, but more complex.
- Centralized flow solver / graph approach — stronger guarantees but breaks ECS separation and serialization ease.

Concrete Recommendations & Minimal API Sketches

1) Spatial index (engine)

```ts
// packages/engine/src/ecs/spatial.ts (suggested)
export class SpatialGrid {
  private grid = new Map<string, EntityId>();
  key(x: number, y: number) { return `${x},${y}`; }
  set(x:number, y:number, id: EntityId) { this.grid.set(this.key(x,y), id); }
  get(x:number, y:number) { return this.grid.get(this.key(x,y)); }
  delete(x:number, y:number) { this.grid.delete(this.key(x,y)); }
}

// World wrapper
world.setEntityPosition(entityId, pos: GridPosition) // updates spatial index
world.getEntityAt(x, y) // O(1)
```

2) Deterministic iteration helper

```ts
// in World
querySorted(...components: Function[]): EntityId[] {
  return this.query(...components).sort((a,b)=>a - b);
}
```

3) Game-level conveyor system (pull-based sketch)

```ts
for (const id of world.querySorted(Conveyor, GridPosition, Direction, ItemBuffer)) {
  const pos = world.get(id, GridPosition)!;
  const dir = world.get(id, Direction)!;
  const buffer = world.get(id, ItemBuffer)!;
  if (buffer.items.length >= buffer.capacity) continue;

  const [dx,dy] = dirToOffset(dir.facing);
  const source = world.getEntityAt(pos.x - dx, pos.y - dy);
  if (!source) continue;
  const sourceBuf = world.get(source, ItemBuffer);
  if (!sourceBuf || sourceBuf.items.length === 0) continue;

  buffer.items.push(sourceBuf.items.shift()!);
}
```

4) Two-phase transfer (for loops and atomicity)

- Phase 1: Build `plannedTransfers: { from, to, item }[]` while respecting capacities.
- Phase 2: Execute all transfers (atomic-ish). Resolve conflicts with deterministic tie-break.

Critical Path (what to do first)
1. Add `SpatialGrid` and `World.getEntityAt(x,y)` — blocker for performance.
2. Add `querySorted` or `queryInto` for deterministic iteration and lower allocation.
3. Implement the basic `conveyor` system in the game package (pull-based, tick accumulator).
4. Add tests: loops, multi-inputs, backpressure, hot-swap.
5. Add two-phase commit if tests show starvation or incorrect transfers in loops.

Tasks (next-small steps for iterative delivery)
- [ ] Implement `SpatialGrid` and wire into `World` (engine).
- [ ] Add `querySorted` and `queryInto` for deterministic/zero-alloc queries.
- [ ] Add `GridPosition`/`Direction`/`ItemBuffer`/`Conveyor` components in game.
- [ ] Implement conveyor system using pull-based transfers.
- [ ] Write unit/integration tests for loop detection, fairness, and performance.
- [ ] Optimize based on test results (two-phase, archetypes, chunking).

Appendix — Notes for implementation
- Use `EntityId` numeric sorting for deterministic ordering.
- Keep components pure data; systems implement behavior.
- Keep visual-only components separate from logic data.
- Keep transfer logic in `update` phase and use `Transform` interpolation for visuals.

---

## Two-sided, multi-slot belts (Factorio-style)

Summary
- Each conveyor entity exposes two independent lanes (sides). Each lane has 4 fixed slots.
- Per tick, each lane shifts items forward one slot (slot 0→1, 1→2, 2→3, 3→output). Visuals interpolate between ticks using `frame.updateProgress`.

Data model (game-level)
- `ItemBuffer` becomes structured per-lane. A simple type sketch:

```ts
type Slot = Item | null;
type Lane = [Slot, Slot, Slot, Slot]; // fixed length = 4
class ItemBuffer {
  lanes: [Lane, Lane]; // [sideA, sideB]
}
```

Notes
- `capacityPerLane` is implicitly 4; include explicit capacity fields if you need flexibility.
- Store items as compact data (IDs or small value objects) inside `ItemBuffer` to avoid creating thousands of entities.

Transfer semantics (slot-level)
- Transfers operate at slot granularity. A receiving conveyor inspects the upstream neighbor's exit slot (index 3) for each lane and attempts to pull it into its lane slot 0.
- Use **pull-based** semantics at lane-level to minimize conflicts: destination tries to pull from the exact upstream lane according to `laneMapping`.
- To avoid races/loops, build a deterministic plan (phase 1) then execute transfers (phase 2).

Lane mapping and junctions
- Straight belt mapping: lane0→lane0, lane1→lane1.
- Curves, splitters and merges must expose an explicit `laneMapping: Array<{ fromLane:number, toLane:number }>` so the conveyor system knows which upstream lane maps to which local lane.
- Splitters choose per-slot target lane using a policy (round-robin, priority, conditional filter). Mergers arbitrate multiple inputs into one lane deterministically.

Rendering
- Keep movement discrete during `update`; slot indices change at tick boundaries.
- For rendering, compute per-item local offsets from slot index and `engine.frame.updateProgress` and draw items interpolated between slot positions.
- If you need per-item animation beyond simple offset, spawn short-lived render-only entities with `Transform` that are updated by a dedicated render system.

Item data vs item entities
- Prefer items-as-data inside `ItemBuffer` for memory and performance.
- Only create full ECS entities for items if they need independent behavior (physics, interaction) or for debug/visual affordances.

Spatial index vs `Transform`
- Implement `SpatialGrid` keyed by `GridPosition` for O(1) lookups. Do not tie the grid to `Transform`.
- `Transform` is for interpolation/visuals. Only entities that require smooth movement need `Transform` (e.g., moving characters, spawned visual items).
- Items stored in `ItemBuffer` do not require `Transform` (avoid entity explosion). Use render-only transient entities if visuals require it.

Edge cases specific to lane/slot model
- Lane starvation: one lane might empty while the other is full; consider splitter policies or lane-balancing rules if desired.
- Lane-crossing: explicit mapping rules are mandatory at junctions to prevent misrouting.
- Loops: slot-level two-phase planning reduces ambiguity, but implement deterministic tie-breakers for remaining conflicts.

API sketches (slot-level helpers)

```ts
function laneHasSpace(buffer: ItemBuffer, laneIndex: 0|1): boolean {
  return buffer.lanes[laneIndex].some(s => s === null);
}

// Plan a pull from upstream lane.slotIndex 3 into destination lane.slotIndex 0
function planPull(from: ItemBuffer, fromLane: number, to: ItemBuffer, toLane: number) {
  return { from, fromLane, to, toLane };
}
```

Small changes to tasks
- Update prototype to use the two-lane, 4-slot `ItemBuffer` model.
- Add unit/integration tests for lane mapping, splitter policies, lane starvation, loops.

---

If you'd like, I will now implement the `ItemBuffer` type and scaffold a prototype `apps/client/src/systems/conveyor` system that implements the two-sided 4-slot belt using pull-based, slot-level transfers. This will include simple visual interpolation notes and a minimal demo harness.

Choose the next step and I will start implementing it and track progress in the TODO list.
