// TYPE DEFINITIONS

export type GizmoAxis = "q1" | "q2" | "q3" | "q4" | "center" | "handle" | null;

// COMPONENT START

export class Gizmo {
  /** The currently active (clicked) gizmo axis, or null if none. */
  public activeAxis: GizmoAxis = null;
}