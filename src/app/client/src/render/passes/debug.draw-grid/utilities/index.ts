import { Grid } from "@client/utilities/grid";
import type { InstancedBucket, InstancedBucketDescriptor, Renderer } from "@engine/render";
import gridFragmentSource from "@client/render/passes/debug.draw-grid/shaders/grid.frag";
import gridVertexSource from "@client/render/passes/debug.draw-grid/shaders/grid.vert";

const GRID_INSTANCE_DATA = new Float32Array(4);
const GRID_BUCKETS = new WeakMap<Renderer, InstancedBucket>();
const GRID_BUCKET_DESCRIPTOR: InstancedBucketDescriptor = {
  vertexSource: gridVertexSource,
  fragmentSource: gridFragmentSource,
  attributes: [{ location: 1, size: 4, offset: 0 }],
  stride: GRID_INSTANCE_DATA.byteLength,
  uniformNames: ["uRadius", "uLineColor"],
};

function createDebugGridBucket(renderer: Renderer): InstancedBucket {
  const bucket = renderer.createInstancedBucket(GRID_BUCKET_DESCRIPTOR);
  bucket.setData(GRID_INSTANCE_DATA, 1);
  return bucket;
}

export function drawDebugGrid(renderer: Renderer): void {
  if (!Grid.outlineDebuggingEnabled) {
    return;
  }

  const bucket = getDebugGridBucket(renderer);

  const zoom = renderer.getCameraZoom();
  if (zoom <= 0) {
    return;
  }

  const width = renderer.getWidth() / zoom;
  const height = renderer.getHeight() / zoom;
  GRID_INSTANCE_DATA[0] = renderer.getCameraX() - width / 2;
  GRID_INSTANCE_DATA[1] = renderer.getCameraY() - height / 2;
  GRID_INSTANCE_DATA[2] = width;
  GRID_INSTANCE_DATA[3] = height;
  bucket.updateRange(GRID_INSTANCE_DATA, 0, 1);

  renderer.drawInstancedBucket(bucket, {
    x: renderer.getCameraX(),
    y: renderer.getCameraY(),
    zoom,
    viewportWidth: renderer.getWidth(),
    viewportHeight: renderer.getHeight(),
  }, {
    uRadius: Grid.radius,
    uLineColor: [1, 0.15, 0.65, 0.75],
  });
}

function getDebugGridBucket(renderer: Renderer): InstancedBucket {
  const existingBucket = GRID_BUCKETS.get(renderer);
  if (existingBucket) {
    return existingBucket;
  }

  const bucket = createDebugGridBucket(renderer);
  GRID_BUCKETS.set(renderer, bucket);
  return bucket;
}