# Architecture Docs

This directory should stay focused on active implementation plans and durable architecture references.

## Current execution path

- [16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md](/workspaces/better-ecs/docs/architecture/16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md)
  - Remaining work to finish the current authoritative multiplayer MVP around a shared command transport, hydration, and low-churn replication.
- [17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md)
  - Follow-up architecture for deterministic mirrored simulation, partition-local readiness barriers, worker execution, and resync.
- [18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md](/workspaces/better-ecs/docs/architecture/18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md)
  - Concrete protocol split for shared commands, selective replication, deterministic partitions, and resync.

## Spatial-contexts references

- [00-SPATIAL-CONTEXTS-ARCHITECTURE.md](/workspaces/better-ecs/docs/architecture/00-SPATIAL-CONTEXTS-ARCHITECTURE.md)
  - Core mental model and engine or plugin boundaries.
- [01-IMPLEMENTATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/01-IMPLEMENTATION-ROADMAP.md)
  - High-level spatial-contexts roadmap.
- [08-PLUGIN-BASED-IMPLEMENTATION.md](/workspaces/better-ecs/docs/architecture/08-PLUGIN-BASED-IMPLEMENTATION.md)
  - Deeper plugin implementation details.
- [09-CONCERNS-AND-CONSIDERATIONS.md](/workspaces/better-ecs/docs/architecture/09-CONCERNS-AND-CONSIDERATIONS.md)
  - Risks and edge cases.
- [10-FEATURE-RENDER-THREADING.md](/workspaces/better-ecs/docs/architecture/10-FEATURE-RENDER-THREADING.md)
  - Render-thread design and transport options.

## Additional references

- [06-FEATURE-VISUAL-EDITOR.md](/workspaces/better-ecs/docs/architecture/06-FEATURE-VISUAL-EDITOR.md)
- [07-FEATURE-PERSISTENCE.md](/workspaces/better-ecs/docs/architecture/07-FEATURE-PERSISTENCE.md)
- [11-FEATURE-ENGINE-PLACEMENT-UI.md](/workspaces/better-ecs/docs/architecture/11-FEATURE-ENGINE-PLACEMENT-UI.md)
- [12-ROADMAP-ENGINE-GAME-PLACEMENT-AND-WORLD-IO.md](/workspaces/better-ecs/docs/architecture/12-ROADMAP-ENGINE-GAME-PLACEMENT-AND-WORLD-IO.md)
- [13-EDITOR-ENGINE-FIRST-MIGRATION.md](/workspaces/better-ecs/docs/architecture/13-EDITOR-ENGINE-FIRST-MIGRATION.md)
- [14-NETWORK-DIFF-AND-DIRTY-TRACKING.md](/workspaces/better-ecs/docs/architecture/14-NETWORK-DIFF-AND-DIRTY-TRACKING.md)
- [15-VISUAL-STATE-COMPONENTS-EXAMPLE.md](/workspaces/better-ecs/docs/architecture/15-VISUAL-STATE-COMPONENTS-EXAMPLE.md)

Completed implementation details should stay in code and tests where possible. Temporary summaries, redirects, and historical scratch plans should be removed instead of kept beside the active path.
| 5-6   | Transitions & Rendering | 2-3   | `packages/foundation/spatial-contexts/src/` + demo scene code                  |
| 7     | Persistence             | 2     | [07](./07-FEATURE-PERSISTENCE.md)                                              |
| 8     | Visual Editor           | 6-7   | [06](./06-FEATURE-VISUAL-EDITOR.md)                                            |

**Total:** 16-20 weeks

### Document Reading Order

**For Understanding:**

1. 00 → 01 → 09 → 10

**For Implementation:**

1. 01 (roadmap) → Feature docs in phase order (04 subdocs → 07 → 06)

**For Review:**

1. 00 → 09 → Feature docs (skim Part 1 of each)

---

## Support

Questions about this architecture? Check:

1. **Concerns document:** [09-CONCERNS-AND-CONSIDERATIONS.md](./09-CONCERNS-AND-CONSIDERATIONS.md)
2. **Architecture discussion:** [00-SPATIAL-CONTEXTS-ARCHITECTURE.md](./00-SPATIAL-CONTEXTS-ARCHITECTURE.md)
3. **Rendering implementation:** engine render/components modules
4. **Project conventions:** `../AGENTS.md`

---

**This documentation represents weeks of careful architectural planning. Use it as the source of truth for spatial contexts implementation.**
