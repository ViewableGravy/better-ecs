import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { InferStandardSchema, StandardSchema } from "@core/types";

export type SystemPriority = number;
export type SystemCleanup = () => void;
export type SystemInitialize = () => void | SystemCleanup;

export type EmptySystemData = Record<string, never>;
export type EmptySystemSchema = StandardSchemaV1<EmptySystemData, EmptySystemData>;

export type SystemOpts<TSchema extends StandardSchema, TMethods extends Record<string, any>> = {
	schema?: {
		default: InferStandardSchema<NoInfer<TSchema>>["input"];
		schema: TSchema;
	};
	priority?: SystemPriority;
	enabled?: boolean;
	system: () => void;
	initialize?: SystemInitialize;
	methods?: (system: EngineSystem<TSchema>) => TMethods;
};

export type SystemFactory<
	TName extends string,
	TSchema extends StandardSchema,
	TMethods extends Record<string, any>,
> = {
	(): EngineSystem<TSchema> & TMethods;
	["~types"]: {
		name: TName;
		schema: TSchema;
	};
};

export type SystemFactoryTuple = Array<SystemFactory<string, StandardSchema, Record<string, any>>>;

export type EngineSystem<TSchema extends StandardSchema = StandardSchema> = {
	name: string;
	data: InferStandardSchema<TSchema>["output"];
	schema: TSchema;
	priority: SystemPriority;
	system: () => void;
	initialize?: SystemInitialize;
	react?: SystemCleanup;
	enabled: boolean;
};

export type EngineInitializationSystem = {
	system: () => Promise<void> | void;
};

