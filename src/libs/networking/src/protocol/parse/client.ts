import { invalidMessage, parseJsonRecord } from "@repo/networking/protocol/parse/universal";
import type { ClientToServerMessage, ParseMessageResult } from "@repo/networking/protocol/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function parseClientMessage(rawMessage: string): ParseMessageResult<ClientToServerMessage> {
	if (rawMessage === "ping") {
		return {
			ok: true,
			value: {
				type: "ping",
			},
		};
	}

	const parsed = parseJsonRecord(rawMessage);
	if (!parsed.ok) {
		return parsed;
	}

	if (parsed.value.type === "ping") {
		return {
			ok: true,
			value: {
				type: "ping",
				timestamp: typeof parsed.value.timestamp === "number" ? parsed.value.timestamp : undefined,
			},
		};
	}

	if (parsed.value.type !== "command") {
		return invalidMessage(
			"unsupported-client-message",
			"Client messages must be either ping or command envelopes.",
		);
	}

	const id = parsed.value.id;
	const name = parsed.value.name;

	if (typeof id !== "string" || id.length === 0) {
		return invalidMessage("invalid-command-id", "Command messages require a non-empty string id.");
	}

	if (typeof name !== "string" || name.length === 0) {
		return invalidMessage("invalid-command-name", "Command messages require a non-empty string name.");
	}

	return {
		ok: true,
		value: {
			type: "command",
			id,
			name,
			payload: parsed.value.payload,
		},
	};
}
