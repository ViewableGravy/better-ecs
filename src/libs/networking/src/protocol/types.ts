import type { DiffCommand } from "@engine/serialization";
import type { SerializedSceneState } from "@libs/state-sync/scene-state";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type ClientPingMessage = {
	type: "ping";
	timestamp?: number;
};

export type ClientCommandMessage<TPayload = unknown> = {
	type: "command";
	id: string;
	name: string;
	payload: TPayload;
};

export type ClientToServerMessage = ClientPingMessage | ClientCommandMessage;

export type ServerSnapshotMessage = {
	type: "snapshot";
	version: number;
	scene: SerializedSceneState;
};

export type ServerDiffMessage = {
	type: "diff";
	version: number;
	commands: readonly DiffCommand[];
};

export type ServerAckMessage = {
	type: "ack";
	commandId: string;
	version: number;
};

export type ServerPongMessage = {
	type: "pong";
	timestamp: number;
};

export type ServerErrorMessage = {
	type: "error";
	code: string;
	message: string;
};

export type ServerToClientMessage =
	| ServerSnapshotMessage
	| ServerDiffMessage
	| ServerAckMessage
	| ServerPongMessage
	| ServerErrorMessage;

export type ParseSuccess<TMessage> = {
	ok: true;
	value: TMessage;
};

export type ParseFailure = {
	ok: false;
	error: ServerErrorMessage;
};

export type ParseMessageResult<TMessage> = ParseSuccess<TMessage> | ParseFailure;
