import type { InferStandardSchema, StandardSchema } from "@engine/core/types";
import {
  type EmptySystemSchema,
  type EngineInitializationSystem,
  type EngineSystem,
  type SystemFactory,
  type SystemOpts,
} from "@engine/core/system/types";

const emptySystemSchema: EmptySystemSchema = {
	"~standard": {
		version: 1,
		vendor: "@repo/engine",
		validate: () => ({ value: {}, issues: [] }),
	},
};

const emptySystemSchemaConfig = {
	default: {},
	schema: emptySystemSchema,
};

export const executeSystemCleanup = (system: EngineSystem): void => {
	if (!system.react) return;

	system.react();
	system.react = undefined;
};

export const executeSystemInitialize = (system: EngineSystem): void => {
	executeSystemCleanup(system);

	if (!system.initialize) return;

	const cleanup = system.initialize();
	if (typeof cleanup === "function") {
		system.react = cleanup;
	}
};

export const createSystem = <TName extends string>(name: TName) => {
	return <TSchema extends StandardSchema = EmptySystemSchema, TMethods extends Record<string, any> = object>(
		opts: SystemOpts<TSchema, TMethods>,
	): SystemFactory<TName, TSchema, TMethods> => {
		const schemaConfig = (opts.schema ?? emptySystemSchemaConfig) as {
			default: InferStandardSchema<NoInfer<TSchema>>["input"];
			schema: TSchema;
		};

		const hmr = globalThis.__ENGINE_HMR__;
		if (hmr?.onSystemCreated) {
			hmr.onSystemCreated({
				name,
				system: opts.system,
				initialize: opts.initialize,
				priority: opts.priority ?? 0,
				enabled: opts.enabled ?? true,
			});
		}

		const factory = (): EngineSystem<TSchema> & TMethods => {
			const system: EngineSystem<TSchema> = {
				name: name,
				data: schemaConfig.default,
				schema: schemaConfig.schema,
				priority: opts.priority ?? 0,
				enabled: opts.enabled ?? true,
				system: opts.system,
				initialize: opts.initialize,
				react: undefined,
			};

			const methods = opts.methods ? opts.methods(system) : ({} as TMethods);

			return Object.assign(system, methods);
		};

		const result: SystemFactory<TName, TSchema, TMethods> = Object.assign(factory, {
			["~types"]: {
				name: name,
				schema: schemaConfig.schema,
			},
		});

		return result;
	};
};

export const createInitializationSystem = (system: () => void): EngineInitializationSystem => {
	return {
		system,
	};
};

export type {
  EmptySystemSchema,
  EngineInitializationSystem,
  EngineSystem,
  SystemFactory,
  SystemFactoryTuple,
  SystemOpts
} from "@engine/core/system/types";

