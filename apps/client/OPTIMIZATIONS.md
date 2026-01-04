# Client Performance & Allocation Optimizations

Short, actionable suggestions to reduce per-frame allocations and GC pressure.

## 1. Input system (`apps/client/src/systems/input.ts`)
- Problem: `pressedThisCycle` is allocated per-update and `eventBuffer` stores small event objects.
- Fixes:
  - Persist `pressedThisCycle` on the system state (e.g. `data.pressedThisCycle`) and `clear()` it each tick instead of `new Set()`.
  - Pool or encode event entries instead of pushing `{ type, key }` objects; options:
    - Small object pool: reuse objects from a free list and return them when consumed.
    - Compact encoding: push tuples/arrays or small numeric codes plus key string (e.g. `['k', key]` or `0|key`).
  - Benefits: removes many short-lived allocations caused by frequent key events.

## 2. Event buffering behavior
- Problem: Every DOM event creates a new JS object pushed into `eventBuffer`.
- Fixes:
  - Use a fixed-size ring buffer of pre-allocated event objects or encoded values.
  - On listener, write into the next slot (overwrite if full) and mark used; on process, decode and reset.
  - Benefits: reduces churn during high input rates, minimal GC overhead.

## 3. ECS queries (`packages/engine/src/ecs/world.ts`)
- Problem: `query(...)` allocates a new `EntityId[]` each call; `Array.from(this.entities)` similarly allocates.
- Fixes:
  - Add `queryInto(resultArray: EntityId[])` API that fills a caller-supplied array and returns its length.
  - Or provide `queryIterator(...)` that yields ids (no allocation of a result array).
  - Or maintain a cached array for frequently-used query combinations and invalidate on mutations.
  - Benefits: eliminates hot allocations in `movement`, `render`, and other systems.

## 4. RAF / start loop (`packages/engine/src/core/utils/start.ts`)
- Problem: `new Promise` is created per frame to await `requestAnimationFrame`, causing closure/promise churn.
- Fixes:
  - Convert to a callback-driven loop (schedule next frame inside RAF callback) rather than awaiting a Promise each frame.
  - Or implement a single reusable promise resolver pattern (more complex).
  - Benefits: reduces per-frame Promise/closure allocations.

## 5. Iterator allocations from `for..of` on Sets/Maps
- Problem: `for..of` creates iterator objects each loop.
- Fixes:
  - Use index-based loops over a reused array mirror for hot sets/maps (maintain parallel array on add/remove).
  - Or copy to a preallocated array once per update and iterate by index.
  - Benefits: avoids iterator allocation churn in very hot loops.

## 6. Miscellaneous temporary arrays
- Problem: calls like `Array.from(this.entities)` create temporary arrays.
- Fixes:
  - Prefer iterator APIs or `queryInto` to reuse buffers.
  - Avoid `Array.from` in hot code paths.

## Prioritized Implementation Plan
1. Reuse `pressedThisCycle` on the input system (low risk, immediate win).
2. Pool/encode `eventBuffer` entries (medium risk, high win for heavy input).
3. Introduce `queryInto` or `queryIterator` (API change, high win across systems).
4. Replace per-frame Promise await in `startEngine` with callback-driven loop (medium complexity).
5. Replace `for..of` in hottest loops with indexed loops over reused arrays (targeted micro-optimizations).

## Quick validation steps
- Run the app and monitor allocation/GC using browser devtools performance/Memory tab.
- Implement one change at a time and re-run to observe allocation differences.
- Focus first on `input` changes (should be visible quickly when tapping keys).

## Notes
- Many fixes involve trade-offs between code complexity and GC pressure. Start with the simplest, highest-impact changes.
- If you want, I can implement and benchmark the first two changes and produce before/after allocation traces.

