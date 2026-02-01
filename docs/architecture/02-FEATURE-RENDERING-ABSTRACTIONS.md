# Feature: Rendering Abstractions

## Part 1: Public API & User Experience

### Overview

This feature provides the foundational rendering primitives for Better ECS, enabling 2D sprite rendering with cameras and transforms. The API is designed to be minimal, giving users full control over rendering behavior.

---

### User-Facing API

#### Components (Engine-Provided)

**Transform Component:**
```typescript
import { Transform } from "@repo/engine/components";

// Create entity with transform
const entity = world.create();
world.add(entity, Transform, {
  x: 100,
  y: 50,
  z: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: Math.PI / 4, // 45 degrees
  scaleX: 2,
  scaleY: 2,
  scaleZ: 1
});
```

**Camera Component:**
```typescript
import { Camera } from "@repo/engine/components";

// Create orthographic camera
const camera = world.create();
world.add(camera, Transform, { x: 0, y: 0, z: 10 });
world.add(camera, Camera, {
  projection: "orthographic",
  orthoSize: 10, // Half-height of visible area
  aspect: 16 / 9,
  near: 0.1,
  far: 1000
});
```

**Sprite Component:**
```typescript
import { Sprite } from "@repo/engine/components";

// Create sprite
const sprite = world.create();
world.add(sprite, Transform, { x: 0, y: 0 });
world.add(sprite, Sprite, {
  texture: "hero.png", // Texture asset ID
  tintR: 1, tintG: 1, tintB: 1, tintA: 1,
  zOrder: 0,
  layer: 0
});
```

---

#### Renderer Interface (Engine-Provided)

```typescript
import { useRenderer } from "@repo/engine/renderer";

const myRenderSystem = createSystem("myRender")({
  phase: "render",
  
  system() {
    const renderer = useRenderer();
    
    // Clear screen
    renderer.clear(0.1, 0.1, 0.1, 1); // Dark gray
    
    // Begin sprite batch
    renderer.beginSpriteBatch();
    
    // Submit sprites (handled by system logic)
    renderer.submitSprite({
      texture: textureHandle,
      transform: worldMatrix,
      source: { x: 0, y: 0, width: 32, height: 32 },
      tint: { r: 1, g: 1, b: 1, a: 1 }
    });
    
    // End batch and flush to GPU
    renderer.endSpriteBatch();
  }
});
```

---

#### Utility Hooks (Engine-Provided)

```typescript
import { useActiveCamera, calculateViewMatrix, calculateProjectionMatrix } from "@repo/engine/renderer/utils";

// Get active camera from world
const camera = useActiveCamera(); // Returns first enabled Camera component

// Calculate matrices
const viewMatrix = calculateViewMatrix(cameraTransform);
const projectionMatrix = calculateProjectionMatrix(camera);
```

---

### User Experience Flow

#### Step 1: Create Camera

```typescript
// In scene setup
setup(world) {
  const camera = world.create();
  world.add(camera, Transform, { x: 0, y: 0, z: 10 });
  world.add(camera, Camera, {
    projection: "orthographic",
    orthoSize: 10
  });
}
```

#### Step 2: Create Sprites

```typescript
// Create a player sprite
const player = world.create();
world.add(player, Transform, { x: 0, y: 0 });
world.add(player, Sprite, {
  texture: "player.png",
  zOrder: 10 // Render in front
});

// Create background
const bg = world.create();
world.add(bg, Transform, { x: 0, y: 0 });
world.add(bg, Sprite, {
  texture: "background.png",
  zOrder: 0 // Render behind
});
```

#### Step 3: Create Render System

```typescript
const spriteRenderer = createSystem("spriteRenderer")({
  phase: "render",
  
  system() {
    const world = useWorld();
    const renderer = useRenderer();
    const camera = useActiveCamera();
    
    // Set camera
    renderer.setCamera(
      calculateViewMatrix(camera.transform),
      calculateProjectionMatrix(camera.camera)
    );
    
    // Get all sprites
    const sprites = world.query(Transform, Sprite);
    
    // Sort by z-order
    sprites.sort((a, b) => {
      const aSprite = world.get(a, Sprite)!;
      const bSprite = world.get(b, Sprite)!;
      return aSprite.zOrder - bSprite.zOrder;
    });
    
    // Render
    renderer.beginSpriteBatch();
    for (const id of sprites) {
      const transform = world.get(id, Transform)!;
      const sprite = world.get(id, Sprite)!;
      
      // Load texture (cached)
      const texture = renderer.getTexture(sprite.texture);
      
      // Submit sprite
      renderer.submitSprite({
        texture,
        transform: calculateWorldMatrix(transform),
        source: { x: 0, y: 0, width: texture.width, height: texture.height },
        tint: { r: sprite.tintR, g: sprite.tintG, b: sprite.tintB, a: sprite.tintA }
      });
    }
    renderer.endSpriteBatch();
  }
});
```

#### Step 4: Register System

```typescript
const GameScene = createScene("game")({
  setup(world) {
    // Setup entities
  }
});

const engine = createEngine({
  scene: GameScene,
  systems: [spriteRenderer] // Register render system
});
```

---

### Example: Complete Scene with Rendering

```typescript
// apps/client/src/scenes/demo.ts
import { createScene, createEngine, createSystem } from "@repo/engine/core";
import { Transform, Camera, Sprite } from "@repo/engine/components";
import { useRenderer, useActiveCamera, calculateViewMatrix, calculateProjectionMatrix, calculateWorldMatrix } from "@repo/engine/renderer";

// Define scene
const DemoScene = createScene("demo")({
  setup(world) {
    // Create camera
    const camera = world.create();
    world.add(camera, Transform, { x: 0, y: 0, z: 10 });
    world.add(camera, Camera, { projection: "orthographic", orthoSize: 10 });
    
    // Create background
    const bg = world.create();
    world.add(bg, Transform, { x: 0, y: 0 });
    world.add(bg, Sprite, { texture: "bg.png", zOrder: 0 });
    
    // Create player
    const player = world.create();
    world.add(player, Transform, { x: 0, y: 0 });
    world.add(player, Sprite, { texture: "player.png", zOrder: 10 });
  }
});

// Define render system
const renderSystem = createSystem("render")({
  phase: "render",
  system() {
    const world = useWorld();
    const renderer = useRenderer();
    const camera = useActiveCamera();
    
    renderer.clear(0, 0, 0, 1);
    renderer.setCamera(
      calculateViewMatrix(camera.transform),
      calculateProjectionMatrix(camera.camera)
    );
    
    const sprites = world.query(Transform, Sprite)
      .sort((a, b) => world.get(a, Sprite)!.zOrder - world.get(b, Sprite)!.zOrder);
    
    renderer.beginSpriteBatch();
    for (const id of sprites) {
      const transform = world.get(id, Transform)!;
      const sprite = world.get(id, Sprite)!;
      renderer.submitSprite({
        texture: renderer.getTexture(sprite.texture),
        transform: calculateWorldMatrix(transform),
        source: { x: 0, y: 0, width: 32, height: 32 },
        tint: { r: sprite.tintR, g: sprite.tintG, b: sprite.tintB, a: sprite.tintA }
      });
    }
    renderer.endSpriteBatch();
  }
});

// Create engine
const engine = createEngine({
  scene: DemoScene,
  systems: [renderSystem]
});
```

---

## Part 2: Internal Implementation Steps

### Story 1: Define Component Types

**Files:**
- `packages/engine/src/components/transform.ts`
- `packages/engine/src/components/camera.ts`
- `packages/engine/src/components/sprite.ts`
- `packages/engine/src/components/index.ts`

**Steps:**
1. Create `Transform` class with TRS properties
2. Create `Camera` class with projection properties
3. Create `Sprite` class with texture and rendering properties
4. Export all components from index

**Acceptance:**
- [ ] Components can be imported from `@repo/engine/components`
- [ ] TypeScript types are correct
- [ ] Components are serializable

---

### Story 2: Create Renderer Interface

**Files:**
- `packages/engine/src/renderer/renderer.ts`
- `packages/engine/src/renderer/types.ts`

**Steps:**
1. Define `Renderer` interface with core methods
2. Define `TextureHandle`, `SpriteRenderData` types
3. Create abstract base class for implementations
4. Add lifecycle methods (init, beginFrame, endFrame)

**Acceptance:**
- [ ] Interface defines clear contract
- [ ] Types are well-documented
- [ ] Ready for WebGL implementation

---

### Story 3: Implement WebGL Renderer

**Files:**
- `packages/engine/src/renderer/webgl/webgl-renderer.ts`
- `packages/engine/src/renderer/webgl/shader.ts`
- `packages/engine/src/renderer/webgl/batch.ts`

**Steps:**
1. Create `WebGLRenderer` class implementing `Renderer`
2. Implement texture loading and caching
3. Create sprite batch system with vertex buffer
4. Write vertex and fragment shaders for sprites
5. Implement camera matrix setup
6. Handle viewport and clear operations

**Acceptance:**
- [ ] Can render multiple sprites per frame
- [ ] Batching reduces draw calls
- [ ] Camera transforms work correctly
- [ ] Texture loading is async and cached

---

### Story 4: Implement Matrix Utilities

**Files:**
- `packages/engine/src/math/mat4.ts`
- `packages/engine/src/math/index.ts`

**Steps:**
1. Create `Mat4` class for 4x4 matrices
2. Implement matrix multiplication
3. Implement view matrix calculation (from camera transform)
4. Implement orthographic projection matrix
5. Implement TRS to matrix conversion
6. Add helper functions (identity, inverse, etc.)

**Acceptance:**
- [ ] Can create view matrix from camera position
- [ ] Can create projection matrix from camera settings
- [ ] Can convert Transform component to world matrix
- [ ] Math is correct (visual verification)

---

### Story 5: Create Renderer Context and Hooks

**Files:**
- `packages/engine/src/renderer/context.ts`
- `packages/engine/src/renderer/hooks.ts`

**Steps:**
1. Create renderer context for injection
2. Implement `useRenderer()` hook
3. Implement `useActiveCamera()` hook
4. Create camera query utilities
5. Integrate with engine context system

**Acceptance:**
- [ ] Systems can access renderer via hook
- [ ] Camera detection works automatically
- [ ] Context is properly scoped

---

### Story 6: Create Rendering Utilities

**Files:**
- `packages/engine/src/renderer/utils.ts`

**Steps:**
1. Implement `calculateViewMatrix(transform)`
2. Implement `calculateProjectionMatrix(camera)`
3. Implement `calculateWorldMatrix(transform, sprite)`
4. Add camera utilities (screen to world, etc.)

**Acceptance:**
- [ ] Utilities produce correct results
- [ ] Easy to use in render systems
- [ ] Well-documented with examples

---

### Story 7: Integrate Renderer with Engine Loop

**Files:**
- `packages/engine/src/core/engine.ts`
- `packages/engine/src/core/context.ts`

**Steps:**
1. Add renderer initialization in engine setup
2. Add canvas parameter to engine config
3. Inject renderer into context
4. Call renderer.beginFrame() / endFrame() in loop
5. Handle resize events

**Acceptance:**
- [ ] Renderer initializes on engine start
- [ ] Frame lifecycle called correctly
- [ ] Canvas resizing works
- [ ] No memory leaks

---

### Story 8: Create Example Render System

**Files:**
- `apps/client/src/systems/spriteRenderer.ts`

**Steps:**
1. Create complete sprite render system
2. Handle camera setup
3. Implement sprite sorting
4. Handle texture loading
5. Add comments and documentation

**Acceptance:**
- [ ] Example system works in demo app
- [ ] Code is clear and well-documented
- [ ] Serves as template for users

---

### Story 9: Add Texture Loading

**Files:**
- `packages/engine/src/renderer/texture-loader.ts`
- `packages/engine/src/renderer/webgl/texture.ts`

**Steps:**
1. Create async texture loader
2. Implement image loading from URLs
3. Add texture caching by ID
4. Handle loading errors gracefully
5. Support texture atlases (future)

**Acceptance:**
- [ ] Textures load asynchronously
- [ ] Caching prevents duplicate loads
- [ ] Errors are handled with fallback texture
- [ ] Memory is managed (unload unused textures)

---

### Story 10: Write Tests

**Files:**
- `packages/engine/src/renderer/renderer.spec.ts`
- `packages/engine/src/math/mat4.spec.ts`
- `packages/engine/src/components/transform.spec.ts`

**Steps:**
1. Test matrix math correctness
2. Test component serialization
3. Test renderer interface compliance
4. Mock WebGL context for testing
5. Test camera calculations

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage > 80%
- [ ] Edge cases handled

---

### Story 11: Write Documentation

**Files:**
- `packages/engine/README.md` (update)
- `docs/RENDERING.md` (new)

**Steps:**
1. Document all public APIs
2. Add usage examples
3. Document renderer interface for implementers
4. Add troubleshooting section
5. Link to architecture docs

**Acceptance:**
- [ ] All APIs documented
- [ ] Examples are runnable
- [ ] Clear for new users

---

## Implementation Order

1. ✅ Story 1: Component types (foundation)
2. ✅ Story 4: Matrix utilities (needed for rendering)
3. ✅ Story 2: Renderer interface (contract)
4. ✅ Story 3: WebGL implementation (core rendering)
5. ✅ Story 9: Texture loading (sprites need textures)
6. ✅ Story 5: Renderer context (access)
7. ✅ Story 6: Rendering utilities (helpers)
8. ✅ Story 7: Engine integration (wiring)
9. ✅ Story 8: Example system (validation)
10. ✅ Story 10: Tests (verification)
11. ✅ Story 11: Documentation (communication)

**Estimated Time:** 2-3 weeks

---

## Testing Strategy

### Unit Tests
- Matrix math correctness
- Component serialization
- Texture loading and caching

### Integration Tests
- Renderer initialization
- Sprite rendering end-to-end
- Camera transforms

### Visual Tests
- Render known scene, compare screenshot
- Test transform composition
- Test z-ordering

---

## Success Criteria

- [ ] Can render 2D sprites with transforms
- [ ] Camera controls view correctly
- [ ] Batching works (performance)
- [ ] Textures load and cache
- [ ] API is intuitive and well-documented
- [ ] Example app demonstrates features
- [ ] Tests pass and coverage is adequate
