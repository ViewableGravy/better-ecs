import { Gizmo, Transform2D } from "../../../components";
import type { GizmoAxis } from "../../../components/gizmo";
import { Color } from "../../../components/sprite";
import { Engine, fromContext } from "../../../context";
import { resolveWorldTransform2D } from "../../../ecs/hierarchy";
import type { ShapeRenderData } from "../../../render/types/low-level";
import { createRenderPass } from "../pass";

// ── CONSTS ───────────────────────────────────────────────────────────────────

/** Fixed pixel radius of the gizmo ring. */
export const GIZMO_RADIUS_PX = 50;

/** Fixed pixel size of the center translation square. */
export const GIZMO_CENTER_SQUARE_PX = 12;

/** Fixed pixel radius of the rotation handle square (half-side). */
export const GIZMO_HANDLE_HALF_PX = 6;

/** Stroke width for the ring outline, in screen pixels. */
const GIZMO_RING_STROKE_PX = 2;

/** Alpha applied to inactive parts when an axis is active. */
const INACTIVE_ALPHA = 0.2;

// ── STATIC COLORS ────────────────────────────────────────────────────────────

const COLOR_Q1 = new Color(1.0, 0.27, 0.27, 1);   // Red
const COLOR_Q2 = new Color(0.27, 1.0, 0.27, 1);   // Green
const COLOR_Q3 = new Color(0.27, 0.53, 1.0, 1);   // Blue
const COLOR_Q4 = new Color(1.0, 1.0, 0.27, 1);    // Yellow
const COLOR_RING = new Color(1, 1, 1, 0.6);
const COLOR_CENTER = new Color(1, 1, 1, 1);
const COLOR_HANDLE = new Color(1, 1, 1, 1);

const TRANSPARENT = new Color(0, 0, 0, 0);

// ── SHARED MUTABLE OBJECTS ───────────────────────────────────────────────────

const SHARED_TRANSFORM = new Transform2D();

const sharedStrokeColor = new Color();

const sharedShape: ShapeRenderData = {
  type: "rectangle",
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  fill: new Color(),
  stroke: null,
  strokeWidth: 0,
  arcStart: 0,
  arcEnd: Math.PI * 2,
};

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getAxisAlpha(axis: GizmoAxis, activeAxis: GizmoAxis): number {
  if (activeAxis === null) {
    return 1;
  }

  return axis === activeAxis ? 1 : INACTIVE_ALPHA;
}

function writeShape(
  shape: ShapeRenderData,
  type: ShapeRenderData["type"],
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  fill: Color,
  fillAlpha: number,
  stroke: Color | null,
  strokeWidth: number,
  arcStart: number,
  arcEnd: number,
): void {
  shape.type = type;
  shape.x = x;
  shape.y = y;
  shape.width = width;
  shape.height = height;
  shape.rotation = rotation;
  shape.scaleX = 1;
  shape.scaleY = 1;
  shape.fill.r = fill.r;
  shape.fill.g = fill.g;
  shape.fill.b = fill.b;
  shape.fill.a = fill.a * fillAlpha;

  if (stroke !== null) {
    sharedStrokeColor.r = stroke.r;
    sharedStrokeColor.g = stroke.g;
    sharedStrokeColor.b = stroke.b;
    sharedStrokeColor.a = stroke.a;
    shape.stroke = sharedStrokeColor;
  } else {
    shape.stroke = null;
  }

  shape.strokeWidth = strokeWidth;
  shape.arcStart = arcStart;
  shape.arcEnd = arcEnd;
}

// ── PASS ─────────────────────────────────────────────────────────────────────

export const GizmoRenderPass = createRenderPass("gizmo-render")({
  scope: "world",
  execute({ world, renderer, alpha }) {
    const engine = fromContext(Engine);

    if (engine.editor.camera.mode !== "engine") {
      return;
    }

    const zoom = renderer.getCameraZoom();

    if (zoom <= 0) {
      return;
    }

    // Convert fixed pixel sizes to world units (so gizmo is screen-space sized).
    const radiusWorld = GIZMO_RADIUS_PX / zoom;
    const centerSquareSizeWorld = GIZMO_CENTER_SQUARE_PX / zoom;
    const handleSizeWorld = GIZMO_HANDLE_HALF_PX * 2 / zoom;
    const ringDiameterWorld = radiusWorld * 2;
    const strokeWidthPx = GIZMO_RING_STROKE_PX;

    for (const entityId of world.query(Gizmo, Transform2D)) {
      const gizmo = world.get(entityId, Gizmo);
      if (!gizmo) {
        continue;
      }

      if (!resolveWorldTransform2D(world, entityId, SHARED_TRANSFORM)) {
        continue;
      }

      const x = SHARED_TRANSFORM.prev.pos.x + (SHARED_TRANSFORM.curr.pos.x - SHARED_TRANSFORM.prev.pos.x) * alpha;
      const y = SHARED_TRANSFORM.prev.pos.y + (SHARED_TRANSFORM.curr.pos.y - SHARED_TRANSFORM.prev.pos.y) * alpha;
      const entityRotation = SHARED_TRANSFORM.curr.rotation;
      const active = gizmo.activeAxis;

      // ── Q3: Blue (π to 3π/2) ──────────────────────────────────────────────
      writeShape(
        sharedShape,
        "arc",
        x, y,
        ringDiameterWorld, ringDiameterWorld,
        0,
        COLOR_Q3, getAxisAlpha("q3", active),
        null, 0,
        Math.PI, Math.PI * 3 / 2,
      );
      renderer.drawShape(sharedShape);

      // ── Q4: Yellow (3π/2 to 2π) ───────────────────────────────────────────
      writeShape(
        sharedShape,
        "arc",
        x, y,
        ringDiameterWorld, ringDiameterWorld,
        0,
        COLOR_Q4, getAxisAlpha("q4", active),
        null, 0,
        Math.PI * 3 / 2, Math.PI * 2,
      );
      renderer.drawShape(sharedShape);

      // ── Q1: Red (0 to π/2) ────────────────────────────────────────────────
      writeShape(
        sharedShape,
        "arc",
        x, y,
        ringDiameterWorld, ringDiameterWorld,
        0,
        COLOR_Q1, getAxisAlpha("q1", active),
        null, 0,
        0, Math.PI / 2,
      );
      renderer.drawShape(sharedShape);

      // ── Q2: Green (π/2 to π) ─────────────────────────────────────────────
      writeShape(
        sharedShape,
        "arc",
        x, y,
        ringDiameterWorld, ringDiameterWorld,
        0,
        COLOR_Q2, getAxisAlpha("q2", active),
        null, 0,
        Math.PI / 2, Math.PI,
      );
      renderer.drawShape(sharedShape);

      // ── Circle ring outline ───────────────────────────────────────────────
      writeShape(
        sharedShape,
        "circle",
        x, y,
        ringDiameterWorld, ringDiameterWorld,
        0,
        TRANSPARENT, 1,
        COLOR_RING, strokeWidthPx,
        0, Math.PI * 2,
      );
      renderer.drawShape(sharedShape);

      // ── Center translation square ─────────────────────────────────────────
      writeShape(
        sharedShape,
        "rectangle",
        x, y,
        centerSquareSizeWorld, centerSquareSizeWorld,
        0,
        COLOR_CENTER, getAxisAlpha("center", active),
        null, 0,
        0, Math.PI * 2,
      );
      renderer.drawShape(sharedShape);

      // ── Rotation handle square (orbits at entity.rotation angle) ──────────
      const handleX = x + radiusWorld * Math.cos(entityRotation);
      const handleY = y + radiusWorld * Math.sin(entityRotation);
      writeShape(
        sharedShape,
        "rectangle",
        handleX, handleY,
        handleSizeWorld, handleSizeWorld,
        entityRotation,
        COLOR_HANDLE, getAxisAlpha("handle", active),
        null, 0,
        0, Math.PI * 2,
      );
      renderer.drawShape(sharedShape);
    }
  },
});
