import {
    type ClientCommandMessage,
    type ClientToServerMessage,
    type ServerToClientMessage,
} from "@repo/networking/protocol/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createCommandMessage<TPayload>(
	name: string,
	payload: TPayload,
	id: string = crypto.randomUUID(),
): ClientCommandMessage<TPayload> {
	return {
		type: "command",
		id,
		name,
		payload,
	};
}

export function serializeNetworkMessage(message: ClientToServerMessage | ServerToClientMessage): string {
	return JSON.stringify(message);
}
