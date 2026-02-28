import type { ShapeRenderData } from "@render/types/low-level";
import type { Vec2 } from "@render/renderers/webGL/drawers/types";

function screenToNdc(canvas: HTMLCanvasElement, x: number, y: number): Vec2 {
  return {
    x: (x / canvas.width) * 2 - 1,
    y: 1 - (y / canvas.height) * 2,
  };
}

export function buildRectangleVertices(canvas: HTMLCanvasElement, center: Vec2, data: ShapeRenderData, cameraZoom: number): Float32Array {
  const widthPixels = data.width * data.scaleX * cameraZoom;
  const heightPixels = data.height * data.scaleY * cameraZoom;

  const cos = Math.cos(data.rotation);
  const sin = Math.sin(data.rotation);

  const halfW = widthPixels / 2;
  const halfH = heightPixels / 2;

  const corners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];

  const ndcCorners = corners.map((corner) => {
    const rx = corner.x * cos - corner.y * sin;
    const ry = corner.x * sin + corner.y * cos;

    const screenX = (center.x + 1) * 0.5 * canvas.width + rx;
    const screenY = (1 - center.y) * 0.5 * canvas.height + ry;
    return screenToNdc(canvas, screenX, screenY);
  });

  return new Float32Array([
    ndcCorners[0].x, ndcCorners[0].y,
    ndcCorners[1].x, ndcCorners[1].y,
    ndcCorners[2].x, ndcCorners[2].y,
    ndcCorners[0].x, ndcCorners[0].y,
    ndcCorners[2].x, ndcCorners[2].y,
    ndcCorners[3].x, ndcCorners[3].y,
  ]);
}

export function buildLineVertices(canvas: HTMLCanvasElement, center: Vec2, data: ShapeRenderData, cameraZoom: number): Float32Array {
  const length = data.width * data.scaleX * cameraZoom;
  const thickness = Math.max(1, data.strokeWidth) * cameraZoom;

  const halfL = length / 2;
  const halfT = thickness / 2;

  const cos = Math.cos(data.rotation);
  const sin = Math.sin(data.rotation);

  const corners = [
    { x: -halfL, y: -halfT },
    { x: halfL, y: -halfT },
    { x: halfL, y: halfT },
    { x: -halfL, y: halfT },
  ];

  const ndcCorners = corners.map((corner) => {
    const rx = corner.x * cos - corner.y * sin;
    const ry = corner.x * sin + corner.y * cos;
    const screenX = (center.x + 1) * 0.5 * canvas.width + rx;
    const screenY = (1 - center.y) * 0.5 * canvas.height + ry;
    return screenToNdc(canvas, screenX, screenY);
  });

  return new Float32Array([
    ndcCorners[0].x, ndcCorners[0].y,
    ndcCorners[1].x, ndcCorners[1].y,
    ndcCorners[2].x, ndcCorners[2].y,
    ndcCorners[0].x, ndcCorners[0].y,
    ndcCorners[2].x, ndcCorners[2].y,
    ndcCorners[3].x, ndcCorners[3].y,
  ]);
}

export function buildCircleQuadVertices(canvas: HTMLCanvasElement, center: Vec2, data: ShapeRenderData, cameraZoom: number): Float32Array {
  const radiusX = (data.width * data.scaleX * cameraZoom) / 2;
  const radiusY = (data.height * data.scaleY * cameraZoom) / 2;

  const corners = [
    { x: -radiusX, y: -radiusY },
    { x: radiusX, y: -radiusY },
    { x: -radiusX, y: radiusY },
    { x: radiusX, y: radiusY },
  ];

  const centerScreenX = (center.x + 1) * 0.5 * canvas.width;
  const centerScreenY = (1 - center.y) * 0.5 * canvas.height;

  const vertices = corners.map((corner) => {
    const screenX = centerScreenX + corner.x;
    const screenY = centerScreenY + corner.y;
    return screenToNdc(canvas, screenX, screenY);
  });

  return new Float32Array([
    vertices[0].x, vertices[0].y,
    vertices[1].x, vertices[1].y,
    vertices[2].x, vertices[2].y,
    vertices[3].x, vertices[3].y,
  ]);
}
