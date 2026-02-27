export type GizmoHandle = "axis-x" | "axis-y" | "ring" | "plane-xy";

export const GIZMO_AXIS_LENGTH_WORLD = 26;
export const GIZMO_ARROW_HEAD_WORLD = 6;
export const GIZMO_RING_RADIUS_WORLD = 26;
export const GIZMO_AXIS_HIT_THICKNESS_WORLD = 6;
export const GIZMO_RING_HIT_THICKNESS_WORLD = 6;
export const GIZMO_PLANE_HANDLE_OFFSET_X_WORLD = 8;
export const GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD = -8;
export const GIZMO_PLANE_HANDLE_SIZE_WORLD = 8;

export class Gizmo {
	public hoveredHandle: GizmoHandle | null;

	constructor() {
		this.hoveredHandle = null;
	}
}