# Scene Transitions & Loading States: Design Suggestions

This document explores different approaches to handling scene transitions, loading states, and visual feedback during scene changes. These are suggestions to consider based on common game development patterns.

---

## Current Architecture Context

Your scene system has:
- **Atomic transitions**: Scene switches are async operations that complete fully before systems resume
- **Isolated worlds**: Each scene has its own entity world
- **SceneManager**: Accessed via `engine.scene.set()` with transition blocking via `isTransitioning`

This provides a clean foundation for implementing various transition patterns.

---

## Option 1: Loading Scenes (Recommended for Complex Games)

**Concept**: Treat loading screens as their own scenes with dedicated entities for displaying progress.

### How It Works

```ts
const LoadingScene = createScene("loading")({
  setup(world) {
    // Create loading UI entities
    const progressBar = world.create();
    world.add(progressBar, UIComponent, { type: "progress-bar", value: 0 });
    
    const loadingText = world.create();
    world.add(loadingText, TextComponent, { text: "Loading..." });
  }
});

const GameScene = createScene("game")({
  async setup(world) {
    // Heavy async work happens here
    await loadAssets();
    await createLevel(world);
  }
});
```

### Transition Flow

```
Menu → Loading → Game

1. User clicks "Play"
2. await engine.scene.set("loading")   // Instant, shows loading UI
3. Start asset loading in background
4. Systems render loading scene
5. When loaded: await engine.scene.set("game")
```

### Pros
- Simple mental model
- Loading screen is a first-class scene
- Can have complex loading UIs (tips, animations, mini-games)
- Works with your current architecture

### Cons
- Requires manual orchestration of the loading flow
- Loading progress updates need a mechanism

### Progress Updates

Option A: **Polling via system state**
```ts
// LoadingSystem tracks progress
const loadingSystem = createSystem("loading")({
  schema: { default: { progress: 0 }, schema: ... },
  system() {
    const { data } = useSystem("loading");
    // Render systems can read data.progress
  }
});

// Somewhere in loading orchestration:
engine.systems["loading"].data.progress = 0.5;
```

Option B: **Component-based updates**
```ts
// Update entities directly during loading
const loadingEntities = world.query(LoadingProgressComponent);
for (const id of loadingEntities) {
  world.get(id, LoadingProgressComponent).progress = 0.5;
}
```

---

## Option 2: Transition Overlays (Fade In/Out)

**Concept**: Visual transitions (fade, slide, wipe) that overlay during scene changes.

### Approach A: Persistent Overlay Entity

Keep a transition overlay in a "persistent" layer that survives scene changes:

```ts
// In engine initialization (not scene-specific)
const overlay = document.createElement("div");
overlay.id = "transition-overlay";
document.body.appendChild(overlay);

// Transition helper
async function transitionTo(sceneName: string) {
  overlay.style.opacity = "1"; // Fade to black
  await sleep(300);
  
  await engine.scene.set(sceneName);
  
  overlay.style.opacity = "0"; // Fade from black
  await sleep(300);
}
```

### Approach B: Transition Manager Extension

Extend SceneManager with built-in transition support:

```ts
// Future enhancement to SceneManager
class SceneManager {
  async setWithTransition(
    sceneName: string, 
    transition: "fade" | "slide" | "instant" = "instant"
  ) {
    if (transition === "fade") {
      await this.fadeOut();
      await this.set(sceneName);
      await this.fadeIn();
    } else {
      await this.set(sceneName);
    }
  }
}
```

### Pros
- Smooth visual transitions
- Hides any loading hitches
- Professional feel

### Cons
- Requires DOM or canvas overlay management
- Adds complexity for simple games
- Transition timing needs tuning

---

## Option 3: Preloading Scenes

**Concept**: Load assets for the next scene while the current scene is still active.

### How It Works

```ts
// Asset preloading service
const assetLoader = {
  cache: new Map(),
  
  async preload(sceneName: string) {
    const manifest = getSceneAssets(sceneName);
    const assets = await Promise.all(manifest.map(loadAsset));
    this.cache.set(sceneName, assets);
  },
  
  getAssets(sceneName: string) {
    return this.cache.get(sceneName);
  }
};

// Preload during menu scene
async function onMenuReady() {
  // User sees menu, assets load in background
  await assetLoader.preload("game");
}

// Instant transition (assets already loaded)
async function onPlayClicked() {
  await engine.scene.set("game"); // Uses cached assets
}
```

### Pros
- Perceived instant transitions
- Better user experience
- Can show loading progress without blocking

### Cons
- Memory usage (assets loaded before needed)
- Complexity in tracking what's preloaded
- May preload assets user never needs

---

## Option 4: Scene Stacking (For Pause Menus, Dialogs)

**Concept**: Stack scenes instead of replacing them. Top scene receives input/focus.

### Future Architecture Consideration

```ts
// Potential future API
engine.scene.push("pause");   // Pause menu over game
engine.scene.pop();           // Back to game

// Scene stack: ["game", "pause"]
// Only "pause" receives input
// Both can render (pause is translucent)
```

### Implementation Notes
- Requires multi-world rendering
- Input routing becomes complex
- Not needed for initial implementation
- Can be added later without breaking changes

---

## Option 5: Streaming/Chunked Loading

**Concept**: Large levels load in chunks as the player moves through them.

### How It Works

```ts
// Level chunks are entities with position bounds
const ChunkComponent = { 
  loaded: boolean,
  bounds: { x: number, y: number, width: number, height: number }
};

// ChunkLoaderSystem
function system() {
  const playerPos = getPlayerPosition();
  const chunks = world.query(ChunkComponent);
  
  for (const id of chunks) {
    const chunk = world.get(id, ChunkComponent);
    
    if (isNearPlayer(chunk.bounds, playerPos) && !chunk.loaded) {
      loadChunk(id);
    }
    
    if (isFarFromPlayer(chunk.bounds, playerPos) && chunk.loaded) {
      unloadChunk(id);
    }
  }
}
```

### Pros
- Essential for large open worlds
- Only loads what's needed
- No loading screens

### Cons
- Significant complexity
- Pop-in can be visible
- Overkill for small games

---

## Recommendation: Start Simple

For your current stage, I recommend:

### Phase 1: Basic Loading Scene
1. Create a `LoadingScene` with simple UI entities
2. Manually orchestrate: Menu → Loading → Game
3. No fancy transitions yet

### Phase 2: Add Fade Transitions
1. CSS-based overlay fade
2. Wrap `engine.scene.set()` with transition helper
3. Keep it outside ECS (DOM-based)

### Phase 3: Asset Preloading (If Needed)
1. Add if loading times become noticeable
2. Start preloading based on user intent (hover over "Play" button)

### Phase 4: Scene Stacking (If Needed)
1. Only add if you need pause menus that don't destroy game state
2. Alternative: just store game state and recreate on unpause

---

## Implementation Sketch: Simple Loading Flow

Here's a concrete starting point:

```ts
// scenes/loading.ts
export const LoadingScene = createScene("loading")({
  setup(world) {
    const text = world.create();
    world.add(text, TextComponent, { text: "Loading...", x: 400, y: 300 });
  }
});

// scenes/game.ts
export const GameScene = createScene("game")({
  async setup(world) {
    // This is where heavy work happens
    await loadGameAssets();
    createPlayer(world);
    createLevel(world);
  }
});

// main.ts
const engine = createEngine({
  systems: [RenderSystem, /* ... */],
  scenes: [MenuScene, LoadingScene, GameScene],
  initialScene: "menu"
});

// When user clicks play:
async function onPlayClicked() {
  // 1. Show loading scene immediately
  await engine.scene.set("loading");
  
  // 2. The GameScene.setup() handles the actual loading
  await engine.scene.set("game");
}
```

This leverages your scene system as-is, with async setup doing the heavy lifting.

---

## Questions to Consider

1. **How complex are your loading needs?** Simple sprite game vs. large asset-heavy game?
2. **Do you need visual transitions?** Or is instant switching acceptable?
3. **Will you have pause menus?** Scene stacking vs. recreating on unpause?
4. **What's your asset loading story?** Bundled vs. dynamic loading?

The beauty of your current architecture is that it enables all these patterns without requiring them. Start simple and add complexity only when you actually need it.
