import { describe, expect, it } from "vitest";

import { FillColor, Opacity, OpacityTrack, Rgba, Shape, StrokeColor, Transform2D } from "@engine/components";
import type { ShapeEntityRenderCommand } from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import { handleShapeEntityCommand } from "@engine/core/render-pipeline/passes/render-world/render/handlers/shape-entity";
import type { EntityId } from "@engine/ecs/entity";
import { UserWorld, World } from "@engine/ecs/world";
import { engineFrameAllocatorRegistry, InternalFrameAllocator } from "@engine/render";
import type { DenseShapeRenderData } from "@engine/render/types/low-level";

describe("handleShapeEntityCommand", () => {
  it("submits fill alpha multiplied by entity opacity components", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();

    world.add(entityId, new Shape("rectangle", 10, 12, 0, 0));
    world.add(entityId, new FillColor(new Rgba(0.95, 0.9, 0.62, 0.4)));
    world.add(entityId, new Opacity(0.5));
    world.add(entityId, new OpacityTrack(0.25));

    const drawCalls: DenseShapeRenderData[] = [];
    const renderer = {
      drawShape: (shape: DenseShapeRenderData) => {
        drawCalls.push(cloneShape(shape));
      },
    };
    const frameAllocator = new InternalFrameAllocator(engineFrameAllocatorRegistry);

    handleShapeEntityCommand(
      createShapeEntityCommand(world, entityId),
      new Transform2D(5, 8),
      renderer,
      frameAllocator,
      1,
    );

    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0]?.fill).toEqual({
      r: 0.95,
      g: 0.9,
      b: 0.62,
      a: 0.05,
    });
  });

  it("submits stroke alpha multiplied by entity opacity components", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();

    world.add(entityId, new Shape("rectangle", 10, 12, 2, 0));
    world.add(entityId, new FillColor(new Rgba(0.2, 0.4, 0.6, 1)));
    world.add(entityId, new StrokeColor(new Rgba(0.1, 0.2, 0.3, 0.8)));
    world.add(entityId, new Opacity(0.5));
    world.add(entityId, new OpacityTrack(0.25));

    const drawCalls: DenseShapeRenderData[] = [];
    const renderer = {
      drawShape: (shape: DenseShapeRenderData) => {
        drawCalls.push(cloneShape(shape));
      },
    };
    const frameAllocator = new InternalFrameAllocator(engineFrameAllocatorRegistry);

    handleShapeEntityCommand(
      createShapeEntityCommand(world, entityId),
      new Transform2D(5, 8),
      renderer,
      frameAllocator,
      1,
    );

    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0]?.stroke).toEqual({
      r: 0.1,
      g: 0.2,
      b: 0.3,
      a: 0.1,
    });
  });
});

function createShapeEntityCommand(world: UserWorld, entityId: EntityId): ShapeEntityRenderCommand {
  return {
    type: "shape-entity",
    world,
    entityId,
    shape: null,
    spriteRecordIndex: undefined,
    scope: "gameplay",
    bucketKind: "shape",
    bucketKey: "shape",
    layer: 0,
    zOrder: 0,
    sequence: 0,
  };
}

function cloneShape(shape: DenseShapeRenderData): DenseShapeRenderData {
  return {
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: shape.rotation,
    scaleX: shape.scaleX,
    scaleY: shape.scaleY,
    fill: new Rgba(shape.fill.r, shape.fill.g, shape.fill.b, shape.fill.a),
    stroke: shape.stroke
      ? new Rgba(shape.stroke.r, shape.stroke.g, shape.stroke.b, shape.stroke.a)
      : null,
    strokeWidth: shape.strokeWidth,
    fillEnabled: shape.fillEnabled,
    arcEnabled: shape.arcEnabled,
    arcStart: shape.arcStart,
    arcEnd: shape.arcEnd,
    cornerRadius: shape.cornerRadius,
  };
}