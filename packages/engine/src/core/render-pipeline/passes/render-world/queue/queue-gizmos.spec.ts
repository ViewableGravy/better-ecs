import { describe, expect, it } from "vitest";

import { Gizmo, Transform2D } from "../../../../../components";
import { UserWorld, World } from "../../../../../ecs/world";
import {
  engineFrameAllocatorRegistry,
  InternalFrameAllocator,
  RenderQueue,
  type Renderer,
} from "../../../../../render";
import { queueGizmos } from "./queue-gizmos";

function collectStrokeAlphas(queue: RenderQueue): number[] {
  const alphas: number[] = [];

  for (const command of queue.commands) {
    const stroke = command.shape?.stroke;
    if (!stroke) {
      continue;
    }

    alphas.push(stroke.a);
  }

  return alphas;
}

describe("queueGizmos", () => {
  it("renders non-active handles at 20% opacity while dragging", () => {
    const world = new UserWorld(new World("scene"));
    const entity = world.create();

    const gizmo = new Gizmo();
    gizmo.hoveredHandle = "axis-x";
    gizmo.activeHandle = "axis-x";

    world.add(entity, new Transform2D(0, 0));
    world.add(entity, gizmo);

    const queue = new RenderQueue();
    const frameAllocator = new InternalFrameAllocator(engineFrameAllocatorRegistry);
    const renderer: Pick<Renderer, "getCameraZoom"> = { getCameraZoom: () => 1 };

    queueGizmos(world, renderer, queue, frameAllocator);

    const alphas = collectStrokeAlphas(queue);
    expect(alphas.length).toBeGreaterThan(0);
    expect(alphas.some((alpha) => alpha === 1)).toBe(true);
    expect(alphas.some((alpha) => alpha === 0.2)).toBe(true);
    expect(alphas.every((alpha) => alpha === 1 || alpha === 0.2)).toBe(true);
  });

  it("does not dim handles when there is no active handle", () => {
    const world = new UserWorld(new World("scene"));
    const entity = world.create();

    const gizmo = new Gizmo();
    gizmo.hoveredHandle = "axis-y";
    gizmo.activeHandle = null;

    world.add(entity, new Transform2D(0, 0));
    world.add(entity, gizmo);

    const queue = new RenderQueue();
    const frameAllocator = new InternalFrameAllocator(engineFrameAllocatorRegistry);
    const renderer: Pick<Renderer, "getCameraZoom"> = { getCameraZoom: () => 1 };

    queueGizmos(world, renderer, queue, frameAllocator);

    const alphas = collectStrokeAlphas(queue);
    expect(alphas.length).toBeGreaterThan(0);
    expect(alphas.every((alpha) => alpha === 1)).toBe(true);
  });
});
