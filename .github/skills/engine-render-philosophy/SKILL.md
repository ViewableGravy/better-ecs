---
name: engine-render-philosophy
description: Philosophy and decision rules for update systems versus render-pipeline stages in Better ECS.
---

# Engine Render Philosophy

## Purpose

Document the intended separation between update systems and the render pipeline so simulation logic and presentation logic do not bleed into each other.

## When to use

- Adding or refactoring engine or app systems.
- Adding or refactoring render-pipeline stages or render passes.
- Reviewing code that mixes simulation state with visual presentation.

## Behavior

1. Treat systems as the place where the world is updated into its next authoritative state.
2. Treat render-pipeline stages as read-only consumers of that world state whose job is to project it onto the screen.
3. Keep render work stateless: derive visual output from current inputs, but never write entity/component state back during render.

## Core split

- Update systems own simulation, gameplay, physics, world mutation, orchestration, and any state that must persist across frames.
- Render stages own presentation, interpolation, draw preparation, and screen output.
- If a behavior changes what the world *is*, it belongs in update.
- If a behavior changes only how the current world state is *shown*, it belongs in render.

## Render rules

- Render is read-only.
- Render must not set component fields, add/remove components, create/destroy entities, or mutate persistent engine state.
- Render may derive transient values from existing state, such as interpolation, blended colors, visual offsets, shader uniforms, or per-frame draw parameters.
- Prefer no persistent state inside render passes. If temporary scratch data is needed for a frame, keep it local and disposable.

## Update rules

- Use update systems to advance animation state when that animation is part of gameplay or persistent world state.
- Use update systems to prepare any authoritative values that render will later read.
- If visual behavior needs history, timers, targets, or transition ownership that persists across frames, model that in update-owned state rather than render-owned mutation.

## Decision test

- Ask: "Would saving and reloading the world need this value?"
- If yes, it belongs in update-owned world state.
- If no, and it only affects presentation this frame, it can be derived in render.

## Equivalent wording from other frameworks

- This follows the same idea as a pure render function in UI frameworks: render describes what to show from state, but does not change the state while rendering.
- In game-engine terms, update is the simulation step and render is the presentation step.
- In graphics-pipeline terms, update produces the scene state; render consumes that scene state to build draw output.
- A useful shorthand is: update is authoritative, render is observational.

## Review guidance

- If render code needs to "fix up" entity state before drawing, the ownership boundary is probably wrong.
- If a system exists only to mutate visual values for later drawing, confirm whether those values are authoritative state or whether render should derive them directly.
- When in doubt, move persistent decision-making earlier into update and keep render as a pure read path.