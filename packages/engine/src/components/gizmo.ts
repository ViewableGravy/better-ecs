export type GizmoHandle = "axis-x" | "axis-y" | "ring";

export class Gizmo {
	public hoveredHandle: GizmoHandle | null;

	constructor() {
		this.hoveredHandle = null;
	}
}