import type { DiffCommand } from "@engine/serialization";
import { invalidMessage, isSceneState, parseJsonRecord } from "@repo/networking/protocol/parse/universal";
import type { ParseMessageResult, ServerToClientMessage } from "@repo/networking/protocol/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function parseServerMessage(rawMessage: string): ParseMessageResult<ServerToClientMessage> {
	const parsed = parseJsonRecord(rawMessage);
	if (!parsed.ok) {
		return parsed;
	}

	switch (parsed.value.type) {
		case "snapshot": {
			if (typeof parsed.value.version !== "number" || !isSceneState(parsed.value.scene)) {
				return invalidMessage(
					"invalid-snapshot",
					"Snapshot messages require a numeric version and serialized scene state.",
				);
			}

			return {
				ok: true,
				value: {
					type: "snapshot",
					version: parsed.value.version,
					scene: parsed.value.scene,
				},
			};
		}

		case "diff": {
			if (typeof parsed.value.version !== "number" || !Array.isArray(parsed.value.commands)) {
				return invalidMessage("invalid-diff", "Diff messages require a numeric version and diff command array.");
			}

			return {
				ok: true,
				value: {
					type: "diff",
					version: parsed.value.version,
					commands: parsed.value.commands as readonly DiffCommand[],
				},
			};
		}

		case "ack": {
			if (typeof parsed.value.commandId !== "string" || typeof parsed.value.version !== "number") {
				return invalidMessage("invalid-ack", "Ack messages require a commandId and numeric version.");
			}

			return {
				ok: true,
				value: {
					type: "ack",
					commandId: parsed.value.commandId,
					version: parsed.value.version,
				},
			};
		}

		case "pong": {
			if (typeof parsed.value.timestamp !== "number") {
				return invalidMessage("invalid-pong", "Pong messages require a numeric timestamp.");
			}

			return {
				ok: true,
				value: {
					type: "pong",
					timestamp: parsed.value.timestamp,
				},
			};
		}

		case "error": {
			if (typeof parsed.value.code !== "string" || typeof parsed.value.message !== "string") {
				return invalidMessage("invalid-error", "Error messages require string code and message fields.");
			}

			return {
				ok: true,
				value: {
					type: "error",
					code: parsed.value.code,
					message: parsed.value.message,
				},
			};
		}

		default:
			return invalidMessage("unsupported-server-message", "Unsupported server message type.");
	}
}
