# Spatial Contexts Architecture Documentation

## Overview

This directory contains the **complete architectural documentation** for implementing spatial contexts in the Better ECS engine. Spatial contexts enable multi-world game design through isolated simulation spaces orchestrated by a plugin system.

**Core Principle:** A context equals a dedicated World instance.

---

## Documentation Index

### Foundation Documents

#### [00-SPATIAL-CONTEXTS-ARCHITECTURE.md](./00-SPATIAL-CONTEXTS-ARCHITECTURE.md)
**The canonical architecture reference.**

Defines the complete spatial contexts architecture including:
- Core mental model (context = world)
- Architecture boundaries (engine/plugin/user)
- Physics integration (isolated per world)
- Rendering model (user-defined composition)
- Persistence approach
- Visual editor integration
- Key architectural decisions

**Start here** to understand the overall design.

---

#### [01-IMPLEMENTATION-ROADMAP.md](./01-IMPLEMENTATION-ROADMAP.md)
**High-level implementation plan.**

Provides step-by-step roadmap with:
- 8 implementation phases
- Task breakdown per phase
- Dependencies and ordering
- Time estimates (13-19 weeks total)
- Milestone definitions
- Risk mitigation strategies

**Use this** to plan development and track progress.

---

#### [05-RENDERING-CONCEPTS.md](./05-RENDERING-CONCEPTS.md)
**Cross-engine rendering analysis and design.**

Comprehensive discussion of rendering primitives:
- Core concepts (Transform, Camera, Mesh, Texture, Sprite)
- Cross-engine comparison (Unity, Godot, Three.js, Bevy)
- Better ECS rendering design (minimal engine, maximum flexibility)
- Integration with spatial contexts
- Implementation recommendations

**Read this** before implementing rendering features.

---

#### [08-PLUGIN-BASED-IMPLEMENTATION.md](./08-PLUGIN-BASED-IMPLEMENTATION.md)
**Detailed plugin implementation specification.**

The original, comprehensive plugin-based implementation document covering:
- Plugin vs engine responsibilities (detailed breakdown)
- Core plugin abstractions with code
- Engine modifications required
- Implementation decisions with rationale
- Complete API design
- Integration patterns
- Performance considerations
- Extensive code examples

**Reference this** for deep implementation details and original design discussions.

---

#### [09-CONCERNS-AND-CONSIDERATIONS.md](./09-CONCERNS-AND-CONSIDERATIONS.md)
**Risk assessment and edge case catalog.**

Documents potential issues:
- Architectural concerns
- Performance concerns
- Edge cases (portal loops, missing targets, etc.)
- Corner cases (rapid switching, large context counts)
- Mental model conflicts
- API design concerns
- Testing challenges
- Future compatibility

**Review this** before each implementation phase.

---

## Feature Implementation Documents

Each feature document has **two parts:**
1. **Public API & User Experience:** How users interact with the feature
2. **Internal Implementation Steps:** Step-by-step stories for development

---

### Phase 1: Rendering Foundations

#### [02-FEATURE-RENDERING-ABSTRACTIONS.md](./02-FEATURE-RENDERING-ABSTRACTIONS.md)
**GPU abstraction and sprite rendering.**

**Public API:**
- Transform, Camera, Sprite components
- Renderer interface
- Rendering utilities and hooks

**Implementation:**
- 11 stories covering components, renderer, WebGL backend, utilities
- Estimated time: 2-3 weeks

**Prerequisites:** None

---

### Phase 2: Scene-Level Systems

#### [03-FEATURE-SCENE-LEVEL-SYSTEMS.md](./03-FEATURE-SCENE-LEVEL-SYSTEMS.md)
**Enable systems to operate at scene level.**

**Public API:**
- `scope: "scene"` in system definition
- `useScene()` hook
- Scene context with multi-world access

**Implementation:**
- 10 stories covering types, scene context, hooks, engine integration
- Estimated time: 1 week

**Prerequisites:** Phase 1 (Rendering)

---

### Phase 3: Multi-World Support

**Note:** Multi-world engine support is documented inline in Phase 2 and Phase 4 documents. It involves:
- Extending SceneManager to track multiple worlds
- Adding `scene.getWorld(id)` accessor
- Migrate implicit default-world usage and provide tooling to remove legacy implicit behaviors

**Estimated time:** 1 week
**Prerequisites:** Phase 2

---

### Phase 4: Spatial Contexts Plugin

#### [04-FEATURE-SPATIAL-CONTEXTS-PLUGIN.md](./04-FEATURE-SPATIAL-CONTEXTS-PLUGIN.md)
**Core plugin implementation.**

**Public API:**
- `createContextScene()` factory
- `useContextManager()`, `useActiveContext()`, `useContextWorld()` hooks
- Portal component and system
- Context streaming

**Implementation:**
- 11 stories covering plugin package, context manager, hooks, portals, streaming
- Estimated time: 2 weeks

**Prerequisites:** Phase 3 (Multi-world support)

---

### Phase 5-6: Transitions and Rendering

**Note:** Context transitions and rendering are covered in the spatial contexts plugin document (04). Key features:
- Portal collision detection
- Context transition orchestration
- Composite rendering (parent + active)
- Rendering utilities

**Estimated time:** 2-3 weeks combined
**Prerequisites:** Phase 4

---

### Phase 7: Persistence

#### [07-FEATURE-PERSISTENCE.md](./07-FEATURE-PERSISTENCE.md)
**Save and load system for contexts.**

**Public API:**
- `saveContext()`, `loadContext()` functions
- `saveScene()`, `loadScene()` functions
- Component serialization with `@Serializable()`
- Save manager utilities

**Implementation:**
- 15 stories covering serialization, world save/load, context persistence, file I/O
- Estimated time: 2 weeks

**Prerequisites:** Phase 6 (Rendering with contexts)

---

### Phase 8: Visual Editor

#### [06-FEATURE-VISUAL-EDITOR.md](./06-FEATURE-VISUAL-EDITOR.md)
**Graphical scene authoring tool.**

**Public Features:**
- Context selector UI
- Entity browser and inspector
- Scene viewport with gizmos
- Portal authoring tool
- Save/load integration

**Implementation:**
- 15 stories covering editor core, UI components, viewport, tools, persistence
- Estimated time: 6-7 weeks

**Prerequisites:** Phase 7 (Persistence)

---

## How to Use This Documentation

### For Project Planning

1. Read **00-SPATIAL-CONTEXTS-ARCHITECTURE.md** for overall design
2. Review **01-IMPLEMENTATION-ROADMAP.md** for timeline
3. Read **09-CONCERNS-AND-CONSIDERATIONS.md** for risks
4. Prioritize phases based on project needs

### For Implementation

1. Select a phase from the roadmap
2. Read the corresponding feature document(s)
3. Review **Part 1: Public API** to understand goals
4. Follow **Part 2: Implementation Steps** story by story
5. Reference **05-RENDERING-CONCEPTS.md** or **09-CONCERNS** as needed
6. Cross-reference with existing codebase patterns

### For Architecture Review

1. Start with **00-SPATIAL-CONTEXTS-ARCHITECTURE.md**
2. Review **09-CONCERNS-AND-CONSIDERATIONS.md** thoroughly
3. Check each feature document's **Public API** section
4. Ensure design aligns with Better ECS principles:
   - Components are pure data
   - Systems do not call each other
   - Zero overhead when unused
   - Plugin-based features
   - Framework-agnostic core

### For New Team Members

1. Read **00-SPATIAL-CONTEXTS-ARCHITECTURE.md** (20 min)
2. Skim **01-IMPLEMENTATION-ROADMAP.md** (10 min)
3. Read **05-RENDERING-CONCEPTS.md** (30 min)
4. Review completed feature documents for implemented phases
5. Reference **09-CONCERNS-AND-CONSIDERATIONS.md** when questions arise

---

## Document Conventions

### Story Format

Each implementation story follows this structure:

```markdown
### Story N: Title

**Files:**
- List of files to create/modify

**Steps:**
1. First step
2. Second step
...

**Acceptance:**
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

### Priority Levels

- ✅ **Required:** Must be implemented
- ⚠️ **Recommended:** Should be implemented
- 💡 **Optional:** Nice to have

### Status Indicators

- ✅ Complete
- 🚧 In Progress
- ⏸️ Paused
- ❌ Blocked

---

## Related Documentation

### Engine Core Docs

- `docs/conveyor-system-design.md` - Example of engine/game responsibility split
- `docs/OPTIMIZATIONS.md` - Performance patterns
- `AGENTS.md` - Project overview and conventions

### Package READMEs

- `packages/engine/README.md` - Engine API reference
- `packages/plugins/*/README.md` - Plugin-specific guides

---

## Principles Alignment

All features in this architecture align with Better ECS principles:

### 1. Components Are Pure Data
✅ All context-related components (Portal, etc.) are pure data
✅ No behavior in components

### 2. Systems Do Not Call Each Other
✅ Systems communicate via shared data (active context ID, etc.)
✅ No direct system-to-system calls

### 3. Zero Overhead When Unused
✅ Spatial contexts are a plugin—games that don't use them pay zero cost
✅ Scene-level systems optional—world-level systems unchanged

### 4. Plugin-Based Features
✅ Spatial contexts live entirely in plugin package
✅ Engine provides only generic multi-world primitives

### 5. Framework-Agnostic Core
✅ Engine has no context-specific code
✅ Rendering is user-defined, not engine-enforced

---

## Version History

**Version 1.0** (2026-02-01)
- Initial comprehensive documentation
- All 8 phases documented
- Feature documents with API and implementation details
- Concerns and considerations catalog

---

## Contributing

When updating this documentation:

1. **Maintain consistency:** Use the same format and terminology across all documents
2. **Update the index:** Add new documents to this README
3. **Cross-reference:** Link related documents where relevant
4. **Version changes:** Note significant changes in version history
5. **Review concerns:** Update concerns document if new risks identified

---

## Quick Reference

### Implementation Timeline

| Phase | Feature | Weeks | Documents |
|-------|---------|-------|-----------|
| 1 | Rendering Foundations | 2-3 | [02](./02-FEATURE-RENDERING-ABSTRACTIONS.md), [05](./05-RENDERING-CONCEPTS.md) |
| 2 | Scene-Level Systems | 1 | [03](./03-FEATURE-SCENE-LEVEL-SYSTEMS.md) |
| 3 | Multi-World Support | 1 | Inline in Phase 2/4 docs |
| 4 | Plugin Core | 2 | [04](./04-FEATURE-SPATIAL-CONTEXTS-PLUGIN.md) |
| 5-6 | Transitions & Rendering | 2-3 | [04](./04-FEATURE-SPATIAL-CONTEXTS-PLUGIN.md) |
| 7 | Persistence | 2 | [07](./07-FEATURE-PERSISTENCE.md) |
| 8 | Visual Editor | 6-7 | [06](./06-FEATURE-VISUAL-EDITOR.md) |

**Total:** 16-20 weeks

### Document Reading Order

**For Understanding:**
1. 00 → 05 → 01 → 09

**For Implementation:**
1. 01 (roadmap) → Feature docs in phase order (02 → 03 → 04 → 07 → 06)

**For Review:**
1. 00 → 09 → Feature docs (skim Part 1 of each)

---

## Support

Questions about this architecture? Check:

1. **Concerns document:** [09-CONCERNS-AND-CONSIDERATIONS.md](./09-CONCERNS-AND-CONSIDERATIONS.md)
2. **Architecture discussion:** [00-SPATIAL-CONTEXTS-ARCHITECTURE.md](./00-SPATIAL-CONTEXTS-ARCHITECTURE.md)
3. **Rendering concepts:** [05-RENDERING-CONCEPTS.md](./05-RENDERING-CONCEPTS.md)
4. **Project conventions:** `../AGENTS.md`

---

**This documentation represents weeks of careful architectural planning. Use it as the source of truth for spatial contexts implementation.**
