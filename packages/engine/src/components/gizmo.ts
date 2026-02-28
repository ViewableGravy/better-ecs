export type GizmoHandle = "axis-x" | "axis-y" | "ring-rotate" | "ring-scale" | "plane-xy";

export const GIZMO_AXIS_LENGTH_WORLD = 39;
export const GIZMO_ARROW_HEAD_WORLD = 4.8;
export const GIZMO_RING_RADIUS_WORLD = 52;
export const GIZMO_ROTATE_RING_INSET_RATIO = 0.15;
export const GIZMO_ROTATE_RING_RADIUS_WORLD = GIZMO_RING_RADIUS_WORLD * (1 - GIZMO_ROTATE_RING_INSET_RATIO);
export const GIZMO_AXIS_HIT_THICKNESS_WORLD = 6;
export const GIZMO_RING_HIT_THICKNESS_WORLD = 6;
export const GIZMO_SCALE_MIN_DISTANCE_WORLD = 0.001;
export const GIZMO_PLANE_HANDLE_OFFSET_X_WORLD = 10;
export const GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD = -10;
export const GIZMO_PLANE_HANDLE_SIZE_WORLD = 12;

export class Gizmo {
	public hoveredHandle: GizmoHandle | null;
	public activeHandle: GizmoHandle | null;
	public rotateStartDeltaX: number | null;
	public rotateStartDeltaY: number | null;
	public rotateCurrentDeltaX: number | null;
	public rotateCurrentDeltaY: number | null;
	public rotateAngleDelta: number | null;
	public scaleStartDistance: number | null;
	public scaleCurrentDistance: number | null;

	constructor() {
		this.hoveredHandle = null;
		this.activeHandle = null;
		this.rotateStartDeltaX = null;
		this.rotateStartDeltaY = null;
		this.rotateCurrentDeltaX = null;
		this.rotateCurrentDeltaY = null;
		this.rotateAngleDelta = null;
		this.scaleStartDistance = null;
		this.scaleCurrentDistance = null;
	}

	public clearRotatePreview(): void {
		this.rotateStartDeltaX = null;
		this.rotateStartDeltaY = null;
		this.rotateCurrentDeltaX = null;
		this.rotateCurrentDeltaY = null;
		this.rotateAngleDelta = null;
	}

	public clearScalePreview(): void {
		this.scaleStartDistance = null;
		this.scaleCurrentDistance = null;
	}

	public clearInteractionPreview(): void {
		this.clearRotatePreview();
		this.clearScalePreview();
	}
}