# Feature: Persistence System

## Part 1: Public API & User Experience

### Overview

The Persistence System enables saving and loading of game state, with special support for spatial contexts. Each context can be saved to its own file, allowing modular world persistence and streaming.

---

### User-Facing API

#### Saving a Context

```typescript
import { saveContext, loadContext } from "@repo/plugins/spatial-contexts/persistence";

// Save single context to file
const contextData = await saveContext("house_1", world);
// Returns JSON-serializable object

// Write to file (browser or Node.js)
await writeFile("save/house_1.json", JSON.stringify(contextData));
```

#### Loading a Context

```typescript
// Read from file
const data = JSON.parse(await readFile("save/house_1.json"));

// Load context from data
const world = await loadContext("house_1", data);
// Returns populated World instance
```

#### Scene Save/Load

```typescript
import { saveScene, loadScene } from "@repo/plugins/spatial-contexts/persistence";

// Save entire scene (all contexts)
const saveData = await saveScene(sceneContext);
// Returns { contexts: { [id]: contextData }, metadata: { ... } }

// Save to disk
await writeFile("save/scene.json", JSON.stringify(saveData));

// Load scene
const sceneData = JSON.parse(await readFile("save/scene.json"));
await loadScene(sceneContext, sceneData);
```

---

### Serialization Format

#### Context File Structure

```json
{
  "version": "1.0",
  "contextId": "house_1",
  "parent": "overworld",
  "metadata": {
    "created": "2026-01-15T10:30:00Z",
    "modified": "2026-01-20T15:45:00Z"
  },
  "entities": [
    {
      "id": 123,
      "components": {
        "Transform": {
          "x": 2,
          "y": 3,
          "z": 0,
          "rotationX": 0,
          "rotationY": 0,
          "rotationZ": 0,
          "scaleX": 1,
          "scaleY": 1,
          "scaleZ": 1
        },
        "Sprite": {
          "texture": "chair.png",
          "zOrder": 0,
          "tintR": 1,
          "tintG": 1,
          "tintB": 1,
          "tintA": 1
        }
      }
    }
  ]
}
```

---

### Component Serialization

#### Built-in Serialization

```typescript
// Components with @Serializable decorator are auto-serialized
import { Serializable } from "@repo/engine/serialization";

@Serializable()
class Transform {
  x: number = 0;
  y: number = 0;
  // ... all properties serialized automatically
}
```

#### Custom Serialization

```typescript
// For complex components, provide custom serializer
@Serializable({
  serialize(component: CustomComponent) {
    return {
      // Custom serialization logic
      specialData: encodeSpecialData(component.data)
    };
  },
  
  deserialize(data: any): CustomComponent {
    return new CustomComponent({
      data: decodeSpecialData(data.specialData)
    });
  }
})
class CustomComponent {
  data: ComplexType;
}
```

---

### User Experience Examples

#### Example 1: Auto-Save on Context Exit

```typescript
const autoSaveSystem = createSystem("autoSave")({
  system() {
    const contextManager = useContextManager();
    const previousContext = getPreviousContext(); // Track state
    const currentContext = contextManager.getActiveContext();
    
    // Player changed context
    if (previousContext && previousContext !== currentContext) {
      // Save previous context
      const world = contextManager.getWorld(previousContext);
      const data = await saveContext(previousContext, world);
      await writeFile(`save/${previousContext}.json`, JSON.stringify(data));
    }
    
    setPreviousContext(currentContext);
  }
});
```

#### Example 2: Loading Context on Demand

```typescript
const contextStreamingSystem = createSystem("contextStreaming")({
  async system() {
    const contextManager = useContextManager();
    
    // Player approaching portal
    const targetContext = getApproachingPortalTarget();
    
    if (targetContext && !contextManager.isLoaded(targetContext)) {
      // Check if saved data exists
      if (await fileExists(`save/${targetContext}.json`)) {
        // Load from save
        const data = JSON.parse(await readFile(`save/${targetContext}.json`));
        await loadContext(targetContext, data, contextManager);
      } else {
        // Create fresh context
        await contextManager.createContext(targetContext);
      }
    }
  }
});
```

#### Example 3: Scene Save Slots

```typescript
// Save to slot 1
async function saveGame(slotNumber: number) {
  const sceneContext = useScene();
  const saveData = await saveScene(sceneContext);
  
  await writeFile(`saves/slot_${slotNumber}.json`, JSON.stringify(saveData));
  
  console.log(`Game saved to slot ${slotNumber}`);
}

// Load from slot 1
async function loadGame(slotNumber: number) {
  const data = JSON.parse(await readFile(`saves/slot_${slotNumber}.json`));
  
  // Transition to saved scene
  await transitionToScene(data.metadata.sceneName);
  
  // Load all contexts
  const sceneContext = getSceneContext();
  await loadScene(sceneContext, data);
  
  console.log(`Game loaded from slot ${slotNumber}`);
}
```

---

## Part 2: Internal Implementation Steps

### Story 1: Define Serialization Interfaces

**Files:**
- `packages/engine/src/serialization/serializer.ts`
- `packages/engine/src/serialization/types.ts`

**Steps:**
1. Define `Serializable` interface
2. Define `SerializationContext` for metadata
3. Create `@Serializable()` decorator
4. Define custom serializer hooks

**Acceptance:**
- [ ] Clear interfaces defined
- [ ] Decorator works with TypeScript
- [ ] Type-safe

---

### Story 2: Implement Component Serialization

**Files:**
- `packages/engine/src/serialization/component-serializer.ts`

**Steps:**
1. Implement default serialization (JSON.stringify properties)
2. Handle custom serializers
3. Support component references
4. Handle circular references (throw error)
5. Serialize component type info

**Implementation:**
```typescript
export class ComponentSerializer {
  serialize(component: any, type: Class<any>): any {
    const customSerializer = getCustomSerializer(type);
    
    if (customSerializer) {
      return customSerializer.serialize(component);
    }
    
    // Default: serialize all properties
    const data: any = { __type: type.name };
    for (const key of Object.keys(component)) {
      data[key] = this.serializeValue(component[key]);
    }
    return data;
  }
  
  deserialize(data: any, type: Class<any>): any {
    const customSerializer = getCustomSerializer(type);
    
    if (customSerializer) {
      return customSerializer.deserialize(data);
    }
    
    // Default: create instance and populate
    const instance = new type();
    for (const key of Object.keys(data)) {
      if (key === '__type') continue;
      instance[key] = this.deserializeValue(data[key]);
    }
    return instance;
  }
  
  private serializeValue(value: any): any {
    // Handle primitives, arrays, objects, etc.
    // Throw error on functions, circular refs, etc.
  }
}
```

**Acceptance:**
- [ ] Components serialize correctly
- [ ] Deserialization recreates instances
- [ ] Custom serializers work
- [ ] Error handling for unsupported types

---

### Story 3: Implement Entity Serialization

**Files:**
- `packages/engine/src/serialization/entity-serializer.ts`

**Steps:**
1. Serialize entity ID and components
2. Handle component ordering
3. Serialize component data using ComponentSerializer
4. Create entity descriptor format

**Format:**
```typescript
interface SerializedEntity {
  id: number;
  components: {
    [componentName: string]: any;
  };
}
```

**Acceptance:**
- [ ] Entities serialize with all components
- [ ] Component names included for deserialization
- [ ] Entity IDs preserved

---

### Story 4: Implement World Serialization

**Files:**
- `packages/engine/src/serialization/world-serializer.ts`

**Steps:**
1. Serialize all entities in world
2. Include world metadata (id, scene)
3. Handle entity references between entities
4. Validate serialization completeness

**Acceptance:**
- [ ] Full world serializes
- [ ] All entities included
- [ ] References handled correctly

---

### Story 5: Implement World Deserialization

**Files:**
- `packages/engine/src/serialization/world-deserializer.ts`

**Steps:**
1. Create new World instance
2. Recreate entities with same IDs
3. Deserialize and add components
4. Restore entity references
5. Validate world state

**Acceptance:**
- [ ] World recreated from data
- [ ] Entity IDs match original
- [ ] All components restored
- [ ] References valid

---

### Story 6: Add Context Metadata

**Files:**
- `packages/plugins/spatial-contexts/src/persistence/context-metadata.ts`

**Steps:**
1. Define context metadata structure
2. Include parent relationship
3. Include timestamps
4. Include version info
5. Allow custom metadata

**Acceptance:**
- [ ] Metadata included in saves
- [ ] Timestamps accurate
- [ ] Version tracking works

---

### Story 7: Implement Context Save/Load

**Files:**
- `packages/plugins/spatial-contexts/src/persistence/context-persistence.ts`

**Steps:**
1. Create `saveContext()` function
2. Create `loadContext()` function
3. Integrate with ContextManager
4. Handle context lifecycle (setup, etc.)
5. Validate context after load

**Acceptance:**
- [ ] Contexts save correctly
- [ ] Contexts load correctly
- [ ] Integration with ContextManager works
- [ ] Lifecycle hooks called

---

### Story 8: Implement Scene Save/Load

**Files:**
- `packages/plugins/spatial-contexts/src/persistence/scene-persistence.ts`

**Steps:**
1. Create `saveScene()` function (saves all contexts)
2. Create `loadScene()` function (loads all contexts)
3. Include scene metadata
4. Handle context dependencies (parent/child)
5. Support partial loading (streaming)

**Acceptance:**
- [ ] Full scene saves
- [ ] Full scene loads
- [ ] Context relationships preserved
- [ ] Can load contexts individually

---

### Story 9: Add File I/O Utilities

**Files:**
- `packages/plugins/spatial-contexts/src/persistence/file-io.ts`

**Steps:**
1. Abstract file operations (browser vs Node)
2. Implement browser storage (IndexedDB or LocalStorage)
3. Implement Node.js file system
4. Handle errors gracefully
5. Add progress callbacks

**Acceptance:**
- [ ] Works in browser
- [ ] Works in Node.js
- [ ] Errors handled
- [ ] Progress reporting available

---

### Story 10: Add Validation and Versioning

**Files:**
- `packages/plugins/spatial-contexts/src/persistence/validation.ts`

**Steps:**
1. Validate save file format
2. Check version compatibility
3. Migrate old saves to new format
4. Provide clear error messages
5. Add schema validation (Zod)

**Acceptance:**
- [ ] Invalid files rejected
- [ ] Version mismatches detected
- [ ] Migration path exists
- [ ] Errors are clear

---

### Story 11: Handle Asset References

**Files:**
- `packages/engine/src/serialization/asset-references.ts`

**Steps:**
1. Serialize asset IDs (textures, sounds, etc.)
2. Ensure assets are loaded before deserializing
3. Handle missing assets (fallback)
4. Support asset packing (embed vs reference)

**Acceptance:**
- [ ] Assets referenced correctly
- [ ] Assets loaded on demand
- [ ] Missing assets handled gracefully

---

### Story 12: Add Save Compression (Optional)

**Files:**
- `packages/plugins/spatial-contexts/src/persistence/compression.ts`

**Steps:**
1. Add optional gzip compression
2. Compress large save files
3. Decompress on load
4. Make compression toggleable

**Acceptance:**
- [ ] Compression reduces file size
- [ ] Decompression works
- [ ] Performance acceptable

---

### Story 13: Create Save Manager Utility

**Files:**
- `packages/plugins/spatial-contexts/src/persistence/save-manager.ts`

**Steps:**
1. Manage save slots
2. List available saves
3. Delete saves
4. Copy saves
5. Get save metadata (without loading)

**Acceptance:**
- [ ] Can manage multiple save slots
- [ ] Metadata accessible without load
- [ ] Operations are safe

---

### Story 14: Write Tests

**Files:**
- `packages/engine/src/serialization/*.spec.ts`
- `packages/plugins/spatial-contexts/src/persistence/*.spec.ts`

**Steps:**
1. Test component serialization
2. Test entity serialization
3. Test world save/load
4. Test context save/load
5. Test version migration
6. Test error handling

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage > 80%
- [ ] Round-trip tests (save then load)

---

### Story 15: Write Documentation

**Files:**
- `docs/PERSISTENCE.md`
- `packages/plugins/spatial-contexts/README.md` (update)

**Steps:**
1. Document save/load APIs
2. Document custom serialization
3. Add examples for common patterns
4. Document file format
5. Troubleshooting guide

**Acceptance:**
- [ ] All APIs documented
- [ ] Examples are clear
- [ ] File format specified

---

## Implementation Order

1. ✅ Story 1: Interfaces
2. ✅ Story 2: Component serialization
3. ✅ Story 3: Entity serialization
4. ✅ Story 4: World serialization
5. ✅ Story 5: World deserialization
6. ✅ Story 6: Context metadata
7. ✅ Story 7: Context save/load
8. ✅ Story 8: Scene save/load
9. ✅ Story 9: File I/O
10. ✅ Story 10: Validation
11. ✅ Story 11: Asset references
12. ✅ Story 13: Save manager
13. ✅ Story 14: Tests
14. ✅ Story 15: Documentation
15. ⚠️ Story 12: Compression (optional)

**Estimated Time:** 2 weeks

---

## Dependencies

**Required:**
- ✅ Spatial contexts plugin (Phase 4)
- ✅ Component system

**Optional:**
- Asset management system
- Compression library

---

## Testing Strategy

### Unit Tests
- Component serialization
- Entity serialization
- Validation logic

### Integration Tests
- Full save/load cycle
- Context dependencies
- Asset references

### Round-Trip Tests
- Save then load, compare states
- Ensure no data loss
- Test with complex scenes

---

## Success Criteria

- [ ] Can save and load individual contexts
- [ ] Can save and load full scenes
- [ ] No data loss in round-trip
- [ ] Custom serialization works
- [ ] Asset references preserved
- [ ] Version migration works
- [ ] Clear error messages
- [ ] Documentation complete
- [ ] Tests pass with good coverage
