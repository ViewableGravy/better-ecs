# Network Dirty Tracking Implementation Status

## Purpose

Track where the networking diff and dirty-tracking refactor is up to while implementation is in progress.

## Current Phase

- Requirements documented.
- First engine-native implementation pass completed.
- Follow-up work remains for broader component migration and wider verification coverage.

## Checklist

- [x] Capture requirements and architecture decisions.
- [x] Create overview technical document.
- [x] Add engine serialization config for dirty queue enablement.
- [x] Introduce global engine registration and singleton enforcement.
- [x] Refactor execution context to read engine-backed values from the global engine.
- [x] Introduce `Component` base type with attachment metadata.
- [x] Introduce `@SerializableComponent` class decorator.
- [x] Refactor `@serializable(...)` to install tracked accessors.
- [x] Support nested tracked objects and class instances.
- [x] Support tracked array index writes and mutating methods.
- [x] Update world create or add or remove flows to emit structural diff commands.
- [x] Attach `entityId` and `worldId` to components on world add.
- [x] Detach component runtime metadata on remove or destroy.
- [x] Add dirty queue abstraction with peek and drain modes.
- [x] Add public diff command types.
- [x] Add JSON diff serialization.
- [x] Add binary diff serialization.
- [x] Add diff replay or apply helpers.
- [ ] Migrate every engine component to the new base component model.
- [x] Update world serialization to use new serializable component model.
- [x] Add tests for direct assignment tracking.
- [x] Add tests for nested object and class-instance tracking.
- [ ] Add tests for array mutation tracking.
- [x] Add tests for structural world mutations.
- [x] Add replay ordering tests.
- [x] Run targeted verification and fix regressions.

## Notes

- Queue storage can be array-backed in this pass.
- No proxies are allowed for tracking.
- Second `createEngine(...)` call in one process should throw.
- Direct property assignment must remain the public mutation style.
- Repository-wide `engine:lint` is still noisy because of pre-existing `.types` declaration issues, so changed-file lint was used for this pass.