import type { EngineRenderCullingOptions } from "@core/factory/types";

export type EngineRenderCullingSettings = {
	enabled: boolean;
	viewportScaleX: number;
	viewportScaleY: number;
	debugOutline: boolean;
};

const DEFAULT_CULLING_SCALE = 0.8;

export function resolveEngineRenderCullingSettings(
	options: EngineRenderCullingOptions | undefined,
): EngineRenderCullingSettings {
	const viewportScaleX = resolveViewportScale(options?.viewportScaleX);
	const viewportScaleY = resolveViewportScale(options?.viewportScaleY);

	return {
		enabled: options?.enabled ?? true,
		viewportScaleX,
		viewportScaleY,
		debugOutline: options?.debugOutline ?? false,
	};
}

function resolveViewportScale(value: number | undefined): number {
	if (value === undefined) {
		return DEFAULT_CULLING_SCALE;
	}

	if (!Number.isFinite(value)) {
		return DEFAULT_CULLING_SCALE;
	}

	if (value <= 0) {
		return 0.01;
	}

	if (value > 1) {
		return 1;
	}

	return value;
}
