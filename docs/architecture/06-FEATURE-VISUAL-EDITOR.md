# Feature: Visual Editor Support

## Part 1: Public API & User Experience

### Overview

The Visual Editor provides a graphical interface for authoring game content, including entity placement, component editing, and spatial context management. The editor is designed as a separate application that communicates with the engine, enabling real-time editing without coupling the engine to editor-specific code.

---

### User-Facing Features

#### Context Selector

**Visual Component:**
- Dropdown/list showing all contexts in the scene
- Current active context highlighted
- Parent context shown with visual indicator
- Ability to switch between contexts

**Behavior:**
- Selecting a context sets it as the "editing context"
- Parent context shown as semi-transparent backdrop
- Entities in parent context are read-only
- New entities created in active context only

---

#### Entity Browser

**Visual Component:**
- Hierarchical tree view of entities in active context
- Search and filter capabilities
- Entity type icons
- Selection state

**Behavior:**
- Click entity to select
- Multi-select supported
- Drag to reorder (if hierarchy plugin enabled)
- Right-click for context menu (delete, duplicate, etc.)

---

#### Scene Viewport

**Visual Component:**
- 2D/3D rendering of the scene
- Camera controls (pan, zoom, rotate)
- Grid overlay
- Gizmos for transform manipulation

**Behavior:**
- Shows active context entities (editable)
- Shows parent context as backdrop (read-only)
- Click entities to select
- Drag entities to move
- Transform gizmos for precise positioning

---

#### Inspector Panel

**Visual Component:**
- Shows components of selected entity
- Component properties as editable fields
- Add/remove component buttons
- Component-specific editors (color picker, asset picker, etc.)

**Behavior:**
- Changes update entity in real-time
- Validation on input
- Undo/redo support
- Save/discard changes

---

#### Context Management Panel

**Visual Component:**
- List of all contexts
- Create/delete context buttons
- Set parent relationship
- Context properties (rendering hints, etc.)

**Behavior:**
- Create new contexts with template
- Delete contexts (with confirmation)
- Reparent contexts via drag-drop
- Edit context metadata

---

#### Portal Authoring Tool

**Visual Component:**
- Visual portal placement in viewport
- Portal properties panel
- Portal preview (shows destination)
- Connection visualization

**Behavior:**
- Click to place portal in scene
- Set target context from dropdown
- Adjust portal size/shape
- Test portal transition in play mode

---

### User Experience Flow

#### 1. Open Scene in Editor

```typescript
// Editor loads scene definition
const editor = createEditor({
  scene: GameScene,
  canvas: editorCanvas
});

await editor.initialize();
```

#### 2. Select Context

User selects "house_1" from context selector.

**Result:**
- Viewport shows house interior entities (editable)
- Overworld shown as backdrop (read-only, translucent)
- Entity browser shows house entities only
- Inspector is ready for editing

#### 3. Create Entity

User clicks "Create Entity" button, selects "Sprite" template.

**Result:**
- New entity created in "house_1" context
- Entity appears in viewport at camera center
- Entity selected automatically
- Inspector shows default components

#### 4. Edit Entity

User adjusts Transform position via gizmo, sets Sprite texture.

**Result:**
- Entity moves in viewport (real-time)
- Component values update in inspector
- Changes marked as "unsaved"

#### 5. Create Portal

User switches to "overworld" context, uses portal tool.

**Result:**
- Clicks placement location
- Sets target to "house_1"
- Portal entity created
- Visual indicator shows portal connection

#### 6. Save Scene

User clicks "Save" button.

**Result:**
- All contexts serialized to JSON
- Files saved (one per context)
- Unsaved changes flag cleared

---

## Part 2: Internal Implementation Steps

### Story 1: Design Editor Architecture

**Files:**
- `docs/architecture/EDITOR_ARCHITECTURE.md`

**Steps:**
1. Define editor/engine separation
2. Design communication protocol
3. Plan state synchronization strategy
4. Define editor-specific components vs gameplay components
5. Plan plugin architecture for editor extensions

**Key Decisions:**
- **Editor as separate app:** Not part of engine core
- **Communication:** Direct API or message passing
- **State:** Editor maintains shadow state for undo/redo
- **Real-time:** Changes apply immediately to engine

**Acceptance:**
- [ ] Architecture documented
- [ ] Communication protocol defined
- [ ] State management strategy clear

---

### Story 2: Create Editor Package Structure

**Files:**
- `apps/editor/package.json`
- `apps/editor/src/index.ts`
- `apps/editor/src/editor.ts`

**Steps:**
1. Create editor app package
2. Setup Vite for editor UI
3. Add dependencies (React/Vue or vanilla)
4. Configure TypeScript
5. Setup hot reload

**Acceptance:**
- [ ] Editor app builds and runs
- [ ] Can import engine packages
- [ ] Dev server works

---

### Story 3: Implement Editor Core

**Files:**
- `apps/editor/src/editor-core.ts`
- `apps/editor/src/editor-state.ts`

**Steps:**
1. Create Editor class
2. Implement scene loading
3. Implement context management
4. Add selection state
5. Add command pattern for undo/redo

**Implementation:**
```typescript
export class Editor {
  private engine: Engine;
  private sceneContext: SceneContext;
  private contextManager: ContextManager;
  private selectedEntities: Set<EntityId> = new Set();
  private commandHistory: Command[] = [];
  private historyIndex: number = -1;
  
  async loadScene(scene: SceneDefinition) {
    // Initialize engine with scene
    this.engine = createEngine({ scene });
    
    // Get context manager (if context scene)
    this.sceneContext = this.engine.getSceneContext();
    this.contextManager = this.sceneContext.getContextManager();
  }
  
  getActiveContext(): string {
    return this.contextManager.getActiveContext();
  }
  
  setActiveContext(contextId: string): void {
    this.contextManager.setActiveContext(contextId);
  }
  
  getContextWorld(contextId: string): UserWorld {
    return useContextWorld(contextId);
  }
  
  selectEntity(entityId: EntityId): void {
    this.selectedEntities.clear();
    this.selectedEntities.add(entityId);
  }
  
  getSelectedEntities(): EntityId[] {
    return Array.from(this.selectedEntities);
  }
  
  executeCommand(command: Command): void {
    command.execute();
    this.commandHistory = this.commandHistory.slice(0, this.historyIndex + 1);
    this.commandHistory.push(command);
    this.historyIndex++;
  }
  
  undo(): void {
    if (this.historyIndex >= 0) {
      this.commandHistory[this.historyIndex].undo();
      this.historyIndex--;
    }
  }
  
  redo(): void {
    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      this.commandHistory[this.historyIndex].execute();
    }
  }
}
```

**Acceptance:**
- [ ] Editor can load scenes
- [ ] Context switching works
- [ ] Selection management works
- [ ] Undo/redo framework ready

---

### Story 4: Implement Context Selector UI

**Files:**
- `apps/editor/src/components/ContextSelector.tsx` (or .ts)

**Steps:**
1. Create context selector component
2. List all contexts
3. Show parent/child relationships
4. Handle context switching
5. Style with visual indicators

**Acceptance:**
- [ ] Shows all contexts
- [ ] Can switch contexts
- [ ] Parent shown visually
- [ ] UI is intuitive

---

### Story 5: Implement Entity Browser

**Files:**
- `apps/editor/src/components/EntityBrowser.tsx`

**Steps:**
1. Create entity list component
2. Query entities from active context
3. Display entity IDs and names (if Name component)
4. Handle selection
5. Add search/filter
6. Add entity type icons

**Acceptance:**
- [ ] Shows entities in active context
- [ ] Selection works
- [ ] Search/filter works
- [ ] Updates in real-time

---

### Story 6: Implement Viewport Renderer

**Files:**
- `apps/editor/src/viewport/viewport.ts`
- `apps/editor/src/viewport/editor-camera.ts`

**Steps:**
1. Create viewport canvas component
2. Implement camera controls (pan, zoom)
3. Render active context
4. Render parent context as backdrop
5. Add grid overlay
6. Handle mouse events (click, drag)

**Acceptance:**
- [ ] Renders scene correctly
- [ ] Camera controls work
- [ ] Composite rendering (parent + active)
- [ ] Mouse picking works

---

### Story 7: Implement Transform Gizmos

**Files:**
- `apps/editor/src/viewport/gizmos.ts`

**Steps:**
1. Create gizmo rendering system
2. Implement position gizmo (arrows)
3. Implement rotation gizmo (circle)
4. Implement scale gizmo (boxes)
5. Handle gizmo interaction (drag to transform)
6. Update entity transform in real-time

**Acceptance:**
- [ ] Gizmos render on selected entity
- [ ] Dragging gizmos updates transform
- [ ] Changes apply to entity immediately
- [ ] Visual feedback clear

---

### Story 8: Implement Inspector Panel

**Files:**
- `apps/editor/src/components/Inspector.tsx`
- `apps/editor/src/components/ComponentEditor.tsx`

**Steps:**
1. Create inspector component
2. Show components of selected entity
3. Create property editors for each type
4. Handle property changes
5. Add/remove component buttons
6. Validate inputs

**Acceptance:**
- [ ] Shows all components
- [ ] Property editing works
- [ ] Changes update entity
- [ ] Add/remove components works
- [ ] Validation prevents invalid values

---

### Story 9: Implement Portal Authoring

**Files:**
- `apps/editor/src/tools/portal-tool.ts`
- `apps/editor/src/components/PortalEditor.tsx`

**Steps:**
1. Create portal placement tool
2. Click to place portal entity
3. Show portal properties panel
4. Target context dropdown
5. Visual connection to target
6. Portal preview/testing

**Acceptance:**
- [ ] Can place portals
- [ ] Can set target
- [ ] Visual feedback clear
- [ ] Portals work when tested

---

### Story 10: Implement Context Management UI

**Files:**
- `apps/editor/src/components/ContextManager.tsx`

**Steps:**
1. Create context management panel
2. List all contexts with metadata
3. Create new context button
4. Delete context (with confirmation)
5. Set parent relationship (drag-drop or dropdown)
6. Edit context properties

**Acceptance:**
- [ ] Can create contexts
- [ ] Can delete contexts
- [ ] Can reparent contexts
- [ ] UI is intuitive

---

### Story 11: Implement Save/Load System

**Files:**
- `apps/editor/src/persistence/scene-saver.ts`
- `apps/editor/src/persistence/scene-loader.ts`

**Steps:**
1. Implement scene serialization
2. Save per-context files
3. Implement scene loading
4. Handle file I/O (browser or Electron)
5. Add save/load UI
6. Track unsaved changes

**Acceptance:**
- [ ] Can save scene
- [ ] Can load scene
- [ ] Per-context files created
- [ ] Unsaved changes tracked
- [ ] No data loss

---

### Story 12: Add Command System

**Files:**
- `apps/editor/src/commands/command.ts`
- `apps/editor/src/commands/transform-command.ts`
- `apps/editor/src/commands/create-entity-command.ts`
- `apps/editor/src/commands/delete-entity-command.ts`

**Steps:**
1. Define Command interface
2. Implement TransformCommand
3. Implement CreateEntityCommand
4. Implement DeleteEntityCommand
5. Implement AddComponentCommand
6. Integrate with undo/redo system

**Acceptance:**
- [ ] All commands implement interface
- [ ] Undo/redo works for all commands
- [ ] No state corruption

---

### Story 13: Add Play Mode

**Files:**
- `apps/editor/src/play-mode.ts`

**Steps:**
1. Add play/stop buttons
2. Save editor state when entering play mode
3. Run engine normally in play mode
4. Restore editor state when stopping
5. Disable editor features during play

**Acceptance:**
- [ ] Can enter play mode
- [ ] Game runs normally
- [ ] Can exit play mode
- [ ] State restored correctly
- [ ] No data loss

---

### Story 14: Write Editor Documentation

**Files:**
- `apps/editor/README.md`
- `docs/EDITOR_GUIDE.md`

**Steps:**
1. Document editor architecture
2. User guide for editor features
3. Keyboard shortcuts
4. Plugin development guide
5. Troubleshooting section

**Acceptance:**
- [ ] Complete feature documentation
- [ ] User guide is clear
- [ ] Examples provided

---

### Story 15: Polish and UX

**Files:**
- Various UI components

**Steps:**
1. Add keyboard shortcuts
2. Improve visual feedback
3. Add tooltips
4. Optimize performance
5. Add loading states
6. Error handling and user messaging

**Acceptance:**
- [ ] Keyboard shortcuts work
- [ ] UI is responsive
- [ ] Errors shown clearly
- [ ] Performance is good

---

## Implementation Order

**Phase 1: Foundation (2 weeks)**
1. ✅ Story 1: Architecture design
2. ✅ Story 2: Package structure
3. ✅ Story 3: Editor core

**Phase 2: Basic Editing (2 weeks)**
4. ✅ Story 6: Viewport renderer
5. ✅ Story 5: Entity browser
6. ✅ Story 8: Inspector panel
7. ✅ Story 7: Transform gizmos
8. ✅ Story 12: Command system

**Phase 3: Context Features (1-2 weeks)**
9. ✅ Story 4: Context selector
10. ✅ Story 10: Context management
11. ✅ Story 9: Portal authoring

**Phase 4: Persistence & Polish (1 week)**
12. ✅ Story 11: Save/load
13. ✅ Story 13: Play mode
14. ✅ Story 15: Polish
15. ✅ Story 14: Documentation

**Total Estimated Time:** 6-7 weeks

---

## Dependencies

**Required Before Starting:**
- ✅ Rendering abstractions (Phase 1)
- ✅ Spatial contexts plugin (Phase 4)
- ✅ Persistence system (Phase 7)

**Nice to Have:**
- Transform interpolation
- Animation system
- Asset management

---

## Testing Strategy

### Manual Testing
- Test all features interactively
- Create sample scenes
- Verify save/load
- Test undo/redo extensively

### Integration Testing
- Test editor + engine integration
- Test context switching
- Test portal creation

### User Testing
- Get feedback from potential users
- Identify UX issues
- Iterate on design

---

## Success Criteria

- [ ] Can load and edit scenes
- [ ] Context switching works smoothly
- [ ] Entity creation and editing intuitive
- [ ] Portal authoring is easy
- [ ] Save/load is reliable
- [ ] Undo/redo works consistently
- [ ] Play mode works correctly
- [ ] UI is polished and responsive
- [ ] Documentation is comprehensive
- [ ] Editor is usable for real game development
