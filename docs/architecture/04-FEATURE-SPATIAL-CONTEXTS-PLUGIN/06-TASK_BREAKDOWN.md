# Spatial Contexts Plugin — Very Small Task Breakdown

Each task here should be small enough to implement + test in a single focused session.

## Phase A — Doc-driven API decisions (no implementation)

1. Finalize terminology: context/world/focused world/stack.
2. Choose names for focus operations (`setFocusedContextId` vs `focusContext`).
3. Decide minimal policy model (visibility + simulation) for v1.

## Phase B — Types + pure logic (unit-testable)

4. Define `ContextId` branding and core types (definition, policy).
5. Implement parent-chain validation (cycle detection).
6. Implement stack computation from focused id.
7. Implement policy application to derive visible/simulated sets.

## Phase C — Runtime manager (no portals/render yet)

8. In-memory definition registry: register/unregister/list.
9. World registry: loaded worlds map.
10. Focus management: set/get focused context.
11. `ensureWorldLoaded(id)` for static definitions.
12. Safe unload rules (cannot unload focused, cannot unload missing).

## Phase D — Scene integration

13. Store context manager on `SceneContext` (plugin-owned attachment strategy).
14. Hook(s): `useContextManager()`, `useFocusedContextId()`.
15. Hook: `useContextWorld(id)`.

## Phase E — Doors/thresholds and portals

16. Define `Portal` component shape (focus vs teleport).
17. Portal detection logic (pure helper): overlap/trigger check.
18. Portal system: focus-only door behavior.
19. Portal system: teleport mode (spawn point).
20. Events: optional `onEnterWorld`, `onExitWorld`, `onPortal`.

## Phase F — Rendering integration

21. Add concept of `getVisibleWorlds()` to manager.
22. Implement a render pipeline stage that iterates visible worlds and commits queues.
23. Demonstrate house backdrop (optional) via per-world modifiers.

## Phase G — Example app/demo (dedicated system)

24. Create a dedicated demo system/scene in the client app.
25. Demonstrate: overworld + house + dungeon + teleport portal.
26. Add a debug overlay showing focused world + stack.

## Phase H — Tests

27. Unit tests for stack + policies.
28. Unit tests for focus/unload invariants.
29. Integration-ish tests for portal focus vs teleport.

## Definition of done (v1)

- Can have multiple worlds loaded simultaneously.
- Exactly one focused world for input.
- House/dungeon behaviors are possible via policy.
- Render pipeline can render visible world list.
- Example runs and acts as regression harness.
