import { describe, expect, it } from "vitest";

import { Gizmo, Transform2D } from "@engine/components";
import { UserWorld, World } from "@engine/ecs/world";
import {
    engineFrameAllocatorRegistry,
    InternalFrameAllocator,
    RenderQueue,
    type Renderer,
} from "@engine/render";
import { queueGizmos } from "@engine/core/render-pipeline/passes/render-world/queue/queue-gizmos";

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

  it("rotates the plane handle with gizmo rotation", () => {
    const world = new UserWorld(new World("scene"));
    const entity = world.create();

    const gizmo = new Gizmo();
    gizmo.hoveredHandle = "plane-xy";

    world.add(entity, new Transform2D(0, 0, Math.PI * 0.25));
    world.add(entity, gizmo);

    const queue = new RenderQueue();
    const frameAllocator = new InternalFrameAllocator(engineFrameAllocatorRegistry);
    const renderer: Pick<Renderer, "getCameraZoom"> = { getCameraZoom: () => 1 };

    queueGizmos(world, renderer, queue, frameAllocator);

    const hasRotatedPlaneHandle = queue.commands.some((command) => {
      const shape = command.shape;
      if (!shape || shape.type !== "rounded-rectangle" || !shape.stroke) {
        return false;
      }

      const isPlaneStroke = shape.stroke.r === 1 && shape.stroke.g === 0.9 && shape.stroke.b === 0.45;
      if (!isPlaneStroke) {
        return false;
      }

      const normalizedRotation = Math.abs(shape.rotation % (Math.PI * 0.5));
      return normalizedRotation > 0.15;
    });

    expect(hasRotatedPlaneHandle).toBe(true);
  });

  it("renders scale preview donut fill at 30% opacity", () => {
    const world = new UserWorld(new World("scene"));
    const entity = world.create();

    const gizmo = new Gizmo();
    gizmo.hoveredHandle = "ring-scale";
    gizmo.activeHandle = "ring-scale";
    gizmo.scaleStartDistance = 30;
    gizmo.scaleCurrentDistance = 50;

    world.add(entity, new Transform2D(0, 0));
    world.add(entity, gizmo);

    const queue = new RenderQueue();
    const frameAllocator = new InternalFrameAllocator(engineFrameAllocatorRegistry);
    const renderer: Pick<Renderer, "getCameraZoom"> = { getCameraZoom: () => 1 };

    queueGizmos(world, renderer, queue, frameAllocator);

    const hasDonutPreviewStroke = queue.commands.some((command) => {
      const stroke = command.shape?.stroke;
      return stroke?.r === 1 && stroke.g === 1 && stroke.b === 1 && stroke.a === 0.3;
    });

    expect(hasDonutPreviewStroke).toBe(true);
  });
});
