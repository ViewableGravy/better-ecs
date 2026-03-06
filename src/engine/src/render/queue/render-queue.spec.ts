import { describe, expect, it } from "vitest";

import type { RenderCommand } from "@engine/render/queue/render-queue";
import { RenderQueue } from "@engine/render/queue/render-queue";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type TestCommandInput = Pick<
  RenderCommand,
  "type" | "scope" | "bucketKind" | "bucketKey" | "layer" | "zOrder"
>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
describe("RenderQueue", () => {
  it("groups gameplay sprite commands by material bucket within a sub-layer", () => {
    const queue = new RenderQueue();

    queue.add(createCommand({
      type: "sprite-entity",
      scope: "gameplay",
      bucketKind: "sprite",
      bucketKey: "sprite:b",
      layer: 0,
      zOrder: 0,
    }));
    queue.add(createCommand({
      type: "sprite-entity",
      scope: "gameplay",
      bucketKind: "sprite",
      bucketKey: "sprite:a",
      layer: 0,
      zOrder: 0,
    }));
    queue.add(createCommand({
      type: "sprite-entity",
      scope: "gameplay",
      bucketKind: "sprite",
      bucketKey: "sprite:b",
      layer: 0,
      zOrder: 0,
    }));

    expect(queue.commands.map((command) => command.bucketKey)).toEqual([
      "sprite:b",
      "sprite:b",
      "sprite:a",
    ]);
  });

  it("renders gameplay scopes before overlay scopes", () => {
    const queue = new RenderQueue();

    queue.add(createCommand({
      type: "shape-draw",
      scope: "overlay",
      bucketKind: "overlay-shape",
      bucketKey: "overlay-shape",
      layer: 0,
      zOrder: 0,
    }));
    queue.add(createCommand({
      type: "shape-entity",
      scope: "gameplay",
      bucketKind: "shape",
      bucketKey: "shape",
      layer: 0,
      zOrder: 0,
    }));

    expect(queue.commands.map((command) => command.scope)).toEqual([
      "gameplay",
      "overlay",
    ]);
  });

  it("orders commands by layer and explicit sub-layer before bucket iteration", () => {
    const queue = new RenderQueue();

    queue.add(createCommand({
      type: "shape-entity",
      scope: "gameplay",
      bucketKind: "shape",
      bucketKey: "shape",
      layer: 2,
      zOrder: 0,
    }));
    queue.add(createCommand({
      type: "shape-entity",
      scope: "gameplay",
      bucketKind: "shape",
      bucketKey: "shape",
      layer: 1,
      zOrder: 3,
    }));
    queue.add(createCommand({
      type: "shape-entity",
      scope: "gameplay",
      bucketKind: "shape",
      bucketKey: "shape",
      layer: 1,
      zOrder: 1,
    }));

    expect(queue.commands.map((command) => `${command.layer}:${command.zOrder}`)).toEqual([
      "1:1",
      "1:3",
      "2:0",
    ]);
  });
});

function createCommand(input: TestCommandInput): RenderCommand {
  return {
    type: input.type,
    world: null,
    entityId: null,
    shape: null,
    spriteRecordIndex: undefined,
    scope: input.scope,
    bucketKind: input.bucketKind,
    bucketKey: input.bucketKey,
    layer: input.layer,
    zOrder: input.zOrder,
    sequence: 0,
  };
}