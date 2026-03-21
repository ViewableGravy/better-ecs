# Render Visual Animation Plan

## Problem

Context-visual alpha changes were previously applied during render to get smooth transitions.
That broke a core rendering rule in this codebase: render should be stateless and should not mutate ECS state.

Even after removing serialization pressure, render-time mutation is still the wrong ownership boundary because it couples drawing, state transitions, and interpolation into the same pass.

## Immediate Direction

The short-term fix is intentionally simple:

1. Move context-visual writes out of render and into an update system.
2. Treat these alpha writes as client-only state and do not track them through serialization.
3. Accept visible UPS-bound stepping for now rather than hiding it behind render-side state mutation.

This is what the code now does for house/context visuals.

## Long-Term Animation Model

We should introduce an explicit runtime animation model for render-facing values instead of mutating component state ad hoc.

### Goals

- Keep render stateless.
- Support interpolation of visual properties between update ticks.
- Support timed transitions over many frames rather than only per-frame lerps.
- Keep animation data client-only unless a specific gameplay feature requires authority/replication.

### Proposed Shape

Introduce explicit runtime animation components or render-state components for visual channels.

Examples:

- `ColorAnimation`
- `OpacityAnimation`
- `RenderValueTrack<T>`

Each track should describe:

- current logical start value
- target value
- start time
- duration
- easing mode
- playback state

The update layer owns scheduling and advancing these tracks.
The render layer only samples already-prepared runtime values for the current frame.

### Sampling Model

Two reasonable options:

1. Update-sampled runtime values
   - Systems compute current runtime color/opacity each update.
   - Render reads the latest runtime value directly.
   - Simplest, but can visibly step at lower UPS.

2. Update-authored animation tracks plus render sampling
   - Update systems author animation start/target/duration.
   - Render samples the track using frame interpolation time.
   - Better visual smoothness while keeping render stateless, because render reads track state but does not mutate ECS.

The second option is the preferred long-term direction.

## Suggested Next Implementation Steps

1. Introduce a small runtime-only animation track for opacity first.
2. Route house/context visuals through that track.
3. Extend the same mechanism to color tint, emissive-like effects, and other non-authoritative render values.
4. Only generalize further once at least two or three distinct visual features share the same abstraction.

## Non-Goals

- Do not serialize client-only presentation tracks by default.
- Do not let render passes mutate ECS state to maintain smoothness.
- Do not reintroduce dirty-queue pressure through presentation-only visual transitions.