# Rendering Concepts: Cross-Engine Analysis & Design

## Purpose

This document analyzes rendering patterns from established game engines and defines how Better ECS will implement rendering primitives to support spatial contexts and general game development.

---

## Table of Contents

1. [Core Rendering Primitives](#core-rendering-primitives)
2. [Cross-Engine Comparison](#cross-engine-comparison)
3. [Better ECS Rendering Design](#better-ecs-rendering-design)
4. [Integration with Spatial Contexts](#integration-with-spatial-contexts)
5. [Implementation Recommendations](#implementation-recommendations)

---

## Core Rendering Primitives

### Transform

**Purpose:** Defines object position, rotation, and scale in space.

**Common Patterns:**
- **Matrix-based:** Store 4x4 transform matrix directly
- **TRS-based:** Store Translation, Rotation, Scale separately
- **Hierarchical:** Support parent/child relationships

**Considerations:**
- Interpolation for smooth rendering
- Parent-relative vs world-space
- 2D vs 3D transforms

---

### Camera

**Purpose:** Defines the viewpoint from which the scene is rendered.

**Common Properties:**
- Position and orientation (transform)
- Projection (orthographic or perspective)
- Field of view / orthographic size
- Near/far clipping planes
- Viewport rectangle

**Considerations:**
- Multiple cameras per scene
- Camera transitions and interpolation
- UI camera vs world camera
- Context-specific cameras

---

### Mesh

**Purpose:** Defines 3D geometry.

**Common Properties:**
- Vertex buffer (positions, normals, UVs, colors)
- Index buffer (triangle definitions)
- Material assignment
- Bounding volume

**Considerations:**
- Static vs dynamic meshes
- Mesh instancing
- Level of detail (LOD)
- Asset loading and caching

---

### Texture

**Purpose:** Image data applied to surfaces.

**Common Properties:**
- Image data (width, height, format)
- Filtering mode (nearest, linear, anisotropic)
- Wrap mode (repeat, clamp, mirror)
- Mipmaps

**Considerations:**
- Texture atlases
- Compressed formats
- Render-to-texture
- Asset loading and caching

---

### Sprite

**Purpose:** 2D image rendering (specialized texture usage).

**Common Properties:**
- Texture reference
- Source rectangle (for atlases)
- Pivot point
- Flip flags (horizontal/vertical)
- Color tint

**Considerations:**
- Sprite batching
- Animation frames
- Z-ordering / layers
- Pixel-perfect rendering

---

### Material

**Purpose:** Defines surface appearance (shaders, textures, properties).

**Common Properties:**
- Shader program
- Texture bindings
- Uniform/property values
- Blend mode
- Render queue

**Considerations:**
- Shader variants
- Property blocks for instancing
- Material reuse and sharing

---

## Cross-Engine Comparison

### Unity

**Transform:**
- Component-based `Transform` (TRS)
- Hierarchical parent/child system
- Separate `RectTransform` for UI

**Camera:**
- `Camera` component with projection settings
- Multiple cameras with depth sorting
- Render textures for off-screen rendering

**Rendering:**
- Mesh + Material system
- Scriptable Render Pipeline (SRP) for customization
- Built-in sprite renderer component

**Integration:**
- Components attached to GameObjects
- Scene graph for hierarchy
- Automatic culling and batching

---

### Godot

**Transform:**
- Node-based `Transform2D` / `Transform3D`
- Hierarchical scene tree
- Automatic transform propagation

**Camera:**
- `Camera2D` / `Camera3D` nodes
- Canvas layers for 2D
- Viewport system for complex scenarios

**Rendering:**
- Material system with shader language
- Built-in sprite nodes
- Immediate geometry API available

**Integration:**
- Node-based architecture
- Signals for communication
- Scene instancing

---

### Three.js (Web)

**Transform:**
- Object3D with position, rotation, scale
- Hierarchical scene graph
- Matrix auto-update or manual

**Camera:**
- PerspectiveCamera / OrthographicCamera
- No built-in multi-camera system (manual setup)

**Rendering:**
- Geometry + Material = Mesh
- Extensive material library
- Custom shaders via ShaderMaterial

**Integration:**
- Scene graph pattern
- Render loop managed by library
- Plugins for post-processing

---

### Bevy (Rust ECS)

**Transform:**
- `Transform` component (TRS)
- Separate `GlobalTransform` for world-space
- Transform hierarchy via parent/child entities

**Camera:**
- `Camera` component with projection
- Multiple cameras via render layers
- Render targets for off-screen

**Rendering:**
- `Mesh` and `Material` components
- Render graph for customization
- Sprite rendering via specialized system

**Integration:**
- Pure ECS, no scene graph
- Systems handle rendering
- Plugin architecture

---

### Comparison Table

| Feature | Unity | Godot | Three.js | Bevy | Better ECS (Proposed) |
|---------|-------|-------|----------|------|----------------------|
| **Transform** | Component, Hierarchical | Node, Hierarchical | Object3D, Hierarchical | Component, Flat (optional hierarchy) | Component, Flat |
| **Camera** | Component | Node | Object | Component | Component |
| **Hierarchy** | Built-in scene graph | Built-in scene tree | Built-in scene graph | Optional (via components) | Optional (via components or plugin) |
| **Rendering Abstraction** | SRP | RenderingServer | WebGLRenderer | Render Graph | Minimal GPU API |
| **User Control** | Medium | Medium | High | High | **Very High** |
| **ECS Integration** | Hybrid (GameObject) | Node-based | N/A | Native | **Native** |

---

## Better ECS Rendering Design

### Design Principles

1. **Minimal Engine, Maximum Flexibility**
   - Engine provides GPU primitives only
   - No built-in rendering policy
   - User defines all rendering behavior

2. **ECS-Native**
   - Rendering via components and systems
   - No special scene graph in engine
   - Hierarchy optional (via plugin if needed)

3. **Performance First**
   - Batching primitives available
   - Manual control over render order
   - Instancing support

4. **Framework-Agnostic**
   - Works with any rendering approach
   - No enforced patterns
   - Easy integration with existing renderers

---

### Proposed Components (Engine)

#### Transform Components

The engine provides specialized transform components to support both 2D and 3D games without unnecessary overhead.

**Transform2D**
Optimized for 2D games. Stores only X/Y position, Z rotation, and X/Y scale.

```typescript
// packages/engine/src/components/transform2d.ts
export class Transform2D {
  // Position
  x: number = 0;
  y: number = 0;
  
  // Rotation (radians, z-axis only)
  rotation: number = 0;
  
  // Scale
  scaleX: number = 1;
  scaleY: number = 1;
}
```

**Transform3D**
Full 3D transform for 3D games or complex 2D setups.

```typescript
// packages/engine/src/components/transform3d.ts
export class Transform3D {
  // Position
  x: number = 0;
  y: number = 0;
  z: number = 0;
  
  // Rotation (euler angles in radians)
  rotationX: number = 0;
  rotationY: number = 0;
  rotationZ: number = 0;
  
  // Scale
  scaleX: number = 1;
  scaleY: number = 1;
  scaleZ: number = 1;
}
```

**Note:** No parent/child hierarchy in core. Hierarchy is a plugin concern if needed. Systems should query for the specific transform type they support, or use a union if handling both.

#### Camera Component

```typescript
// packages/engine/src/components/camera.ts
export type ProjectionType = "orthographic" | "perspective";

export class Camera {
  // Projection
  projection: ProjectionType = "orthographic";
  
  // Orthographic
  orthoSize: number = 10; // Half-height in world units
  
  // Perspective
  fov: number = 60; // Field of view in degrees
  
  // Common
  near: number = 0.1;
  far: number = 1000;
  aspect: number = 16/9; // Usually set from viewport
  
  // Viewport (normalized 0-1)
  viewportX: number = 0;
  viewportY: number = 0;
  viewportWidth: number = 1;
  viewportHeight: number = 1;
  
  // Enabled flag
  enabled: boolean = true;
}
```

#### Sprite Component

```typescript
// packages/engine/src/components/sprite.ts
export class Sprite {
  // Texture reference (asset ID or handle)
  texture: string = "";
  
  // Source rectangle in texture (for atlases)
  // null = use entire texture
  sourceX: number = 0;
  sourceY: number = 0;
  sourceWidth: number = 0; // 0 = use texture width
  sourceHeight: number = 0; // 0 = use texture height
  
  // Pivot point (0-1, origin for rotation/scaling)
  pivotX: number = 0.5;
  pivotY: number = 0.5;
  
  // Flip flags
  flipX: boolean = false;
  flipY: boolean = false;
  
  // Color tint (RGBA)
  tintR: number = 1;
  tintG: number = 1;
  tintB: number = 1;
  tintA: number = 1;
  
  // Z-order (for sorting within layer)
  zOrder: number = 0;
  
  // Render layer (for multi-pass rendering)
  layer: number = 0;
}
```

---

### Proposed GPU Abstraction (Engine)

#### Renderer Interface

```typescript
// packages/engine/src/renderer/renderer.ts
export interface Renderer {
  // Initialization
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  
  // Frame lifecycle
  beginFrame(): void;
  endFrame(): void;
  
  // Viewport
  setViewport(x: number, y: number, width: number, height: number): void;
  
  // Camera
  setCamera(viewMatrix: Mat4, projectionMatrix: Mat4): void;
  
  // Texture management
  loadTexture(id: string, image: ImageData | HTMLImageElement): TextureHandle;
  deleteTexture(handle: TextureHandle): void;
  
  // Sprite batch rendering
  beginSpriteBatch(): void;
  submitSprite(sprite: SpriteRenderData): void;
  endSpriteBatch(): void;
  
  // Mesh rendering (future)
  renderMesh(mesh: MeshHandle, material: MaterialHandle, transform: Mat4): void;
  
  // Clear
  clear(r: number, g: number, b: number, a: number): void;
}

export interface SpriteRenderData {
  texture: TextureHandle;
  transform: Mat4; // World transform
  source: { x: number; y: number; width: number; height: number };
  tint: { r: number; g: number; b: number; a: number };
}
```

**Implementations:**
- `WebGLRenderer` - WebGL 2.0 backend
- `WebGPURenderer` - WebGPU backend (future)

---

### User-Defined Render Systems

Users create systems that use the renderer:

```typescript
// apps/client/src/systems/spriteRender.ts
const spriteRenderSystem = createSystem("spriteRender")({
  phase: "render",
  
  system() {
    const world = useWorld();
    const renderer = useRenderer(); // Injected by engine
    const camera = useActiveCamera();
    
    // Set camera
    const viewMatrix = calculateViewMatrix(camera);
    const projMatrix = calculateProjectionMatrix(camera);
    renderer.setCamera(viewMatrix, projMatrix);
    
    // Collect sprites
    const sprites = world.query(Transform, Sprite);
    
    // Sort by layer, then z-order
    sprites.sort((a, b) => {
      const spriteA = world.get(a, Sprite)!;
      const spriteB = world.get(b, Sprite)!;
      if (spriteA.layer !== spriteB.layer) return spriteA.layer - spriteB.layer;
      return spriteA.zOrder - spriteB.zOrder;
    });
    
    // Batch render
    renderer.beginSpriteBatch();
    for (const id of sprites) {
      const transform = world.get(id, Transform)!;
      const sprite = world.get(id, Sprite)!;
      
      renderer.submitSprite({
        texture: sprite.texture,
        transform: calculateWorldMatrix(transform, sprite),
        source: { x: sprite.sourceX, y: sprite.sourceY, 
                  width: sprite.sourceWidth, height: sprite.sourceHeight },
        tint: { r: sprite.tintR, g: sprite.tintG, 
                b: sprite.tintB, a: sprite.tintA }
      });
    }
    renderer.endSpriteBatch();
  }
});
```

**Key Insight:** User controls everything—sorting, culling, batching, effects.

---

## Integration with Spatial Contexts

### Context-Aware Rendering

```typescript
const contextRenderSystem = createSystem("contextRender")({
  phase: "render",
  
  system() {
    const contextManager = useContextManager();
    const renderer = useRenderer();
    
    const activeContext = contextManager.getActiveContext();
    const parentContext = contextManager.getParent(activeContext);
    
    // Clear screen
    renderer.clear(0, 0, 0, 1);
    
    // Render parent context (if exists)
    if (parentContext) {
      const parentWorld = contextManager.getWorld(parentContext);
      renderWorld(renderer, parentWorld, { opacity: 0.3, blur: true });
    }
    
    // Render active context
    const activeWorld = contextManager.getWorld(activeContext);
    renderWorld(renderer, activeWorld, { opacity: 1.0, blur: false });
  }
});

function renderWorld(
  renderer: Renderer, 
  world: World, 
  options: { opacity: number; blur: boolean }
) {
  // Get camera from world
  const cameraEntities = world.query(Transform, Camera);
  const cameraId = cameraEntities[0]; // Use first camera
  const cameraTransform = world.get(cameraId, Transform)!;
  const camera = world.get(cameraId, Camera)!;
  
  // Set camera
  renderer.setCamera(
    calculateViewMatrix(cameraTransform),
    calculateProjectionMatrix(camera)
  );
  
  // Render sprites
  renderer.beginSpriteBatch();
  for (const id of world.query(Transform, Sprite)) {
    const transform = world.get(id, Transform)!;
    const sprite = world.get(id, Sprite)!;
    
    // Apply context opacity
    const tint = {
      r: sprite.tintR,
      g: sprite.tintG,
      b: sprite.tintB,
      a: sprite.tintA * options.opacity
    };
    
    renderer.submitSprite({
      texture: sprite.texture,
      transform: calculateWorldMatrix(transform, sprite),
      source: { /* ... */ },
      tint
    });
  }
  renderer.endSpriteBatch();
  
  // Apply blur post-effect if needed (user-defined)
  if (options.blur) {
    applyBlurEffect(renderer);
  }
}
```

**Key Points:**
- Each context (world) has its own camera(s)
- Rendering iterates over multiple worlds
- Composition defined by user code
- No engine magic

---

### Multiple Cameras Per Context

```typescript
// User can define multiple cameras per world
const mainCamera = world.create();
world.add(mainCamera, Transform, { x: 0, y: 0, z: 10 });
world.add(mainCamera, Camera, { 
  projection: "orthographic", 
  orthoSize: 10,
  layer: 0 // Main layer
});

const minimapCamera = world.create();
world.add(minimapCamera, Transform, { x: 0, y: 0, z: 10 });
world.add(minimapCamera, Camera, { 
  projection: "orthographic", 
  orthoSize: 100, // Zoomed out
  viewportX: 0.8, viewportY: 0.8, // Top-right corner
  viewportWidth: 0.2, viewportHeight: 0.2,
  layer: 0
});

// Render system handles multiple cameras
for (const cameraId of world.query(Camera, Transform)) {
  const camera = world.get(cameraId, Camera)!;
  if (!camera.enabled) continue;
  
  // Set viewport for this camera
  renderer.setViewport(/* ... */);
  
  // Render sprites visible to this camera
  renderSpritesForCamera(world, camera);
}
```

---

## Implementation Recommendations

### Phase 1: Minimal Viable Rendering

**Components:**
- ✅ Transform
- ✅ Camera (orthographic only)
- ✅ Sprite

**Renderer:**
- ✅ WebGL 2.0 backend
- ✅ Sprite batching
- ✅ Texture loading

**Systems:**
- ✅ Simple sprite render system (example)

**Goal:** Render 2D sprites with transforms and camera.

---

### Phase 2: Enhanced 2D

**Components:**
- ✅ Animation (sprite sheet support)
- ✅ Render layer component

**Renderer:**
- ✅ Texture atlas support
- ✅ Render-to-texture

**Systems:**
- ✅ Animation system
- ✅ Multi-camera rendering
- ✅ Post-processing example

---

### Phase 3: 3D Foundation

**Components:**
- ✅ Mesh
- ✅ Material

**Renderer:**
- ✅ Mesh rendering
- ✅ Lighting (basic)

**Systems:**
- ✅ Mesh render system

---

### Design Anti-Patterns to Avoid

❌ **Don't:** Build high-level rendering API into engine
✅ **Do:** Provide low-level GPU primitives

❌ **Don't:** Enforce scene graph or hierarchy
✅ **Do:** Let users choose structure

❌ **Don't:** Auto-render based on components
✅ **Do:** Let users write render systems

❌ **Don't:** Hardcode rendering passes
✅ **Do:** Give tools for custom passes

---

## Conclusion

Better ECS rendering follows a **minimalist, user-empowering** approach:

- **Engine provides:** GPU abstraction, basic components, renderer interface
- **User provides:** Render systems, sorting, culling, effects, composition
- **Plugin provides:** Optional higher-level features (hierarchy, context rendering)

This design ensures:
- ✅ Maximum flexibility
- ✅ Zero overhead for custom renderers
- ✅ Native ECS integration
- ✅ Spatial contexts support
- ✅ Framework-agnostic core

Next: See [02-FEATURE-RENDERING-ABSTRACTIONS.md](./02-FEATURE-RENDERING-ABSTRACTIONS.md) for detailed implementation steps.
