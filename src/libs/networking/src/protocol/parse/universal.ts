import type { SerializedSceneState } from "@libs/state-sync/scene-state";
import type { ParseFailure, ParseMessageResult } from "@repo/networking/protocol/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function parseJsonRecord(rawMessage: string): ParseMessageResult<Record<string, unknown>> {
	let parsed: unknown;

	try {
		parsed = JSON.parse(rawMessage);
	} catch {
		return invalidMessage("invalid-json", "Network messages must be valid JSON.");
	}

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return invalidMessage("invalid-message-shape", "Network messages must be JSON objects.");
	}

	return {
		ok: true,
		value: parsed as Record<string, unknown>,
	};
}

export function invalidMessage(code: string, message: string): ParseFailure {
	return {
		ok: false,
		error: {
			type: "error",
			code,
			message,
		},
	};
}

export function isSceneState(value: unknown): value is SerializedSceneState {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}

	const candidate = value as {
		sceneName?: unknown;
		worlds?: unknown;
	};

	return typeof candidate.sceneName === "string" && Array.isArray(candidate.worlds);
}
