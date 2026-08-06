# Terrain Rendering Direction

## Recommendation

Use a **cell-authored, chunk-rendered terrain system**.

Each grid cell owns a small amount of authoritative terrain state, such as `grass`, `dirt`,
`shallow-water`, or `deep-water`. The renderer does not create one ECS sprite entity per cell.
Instead, it reads the visible cells, derives a visual variant from each cell and its six neighbors,
and submits the result through a small number of instanced GPU buckets.

This gives us the visual language we want: a river can occupy several adjacent cells, grass can sit
directly beside it, and the boundary can use transition art. It also preserves the game's physical
world model because the cell's terrain type remains real world state rather than merely a decorative
texture choice.

The important distinction is:

```text
authoritative cell state -> neighbor mask / visual variant -> chunked GPU instances
```

The first step belongs to world/update-owned data. The last two are presentation and belong in a
`world:terrain` render pass or a renderer-owned terrain presenter.

## Terrain Data and Chunk Ownership

The terrain data layer should own the authoritative grid and expose chunks as its unit of storage
and invalidation. It may be one terrain data system or a small group of cooperating classes, but it
must not depend on rendering. Each chunk contains all of its tiles in a dense, fixed-size structure;
the tile data remains world state and can later be extended with simulation fields such as elevation,
movement cost, fertility, or water behavior.

Chunk coordinates must use mathematical floor division for every grid coordinate, including negative
coordinates. A tile on the negative side of an origin belongs to the chunk obtained by flooring its
coordinate divided by the chunk size, so the border around the origin is assigned consistently to the
chunk at `(-1, -1)` rather than depending on language-specific integer truncation. The same mapping
must be used by tile lookup, chunk creation, dirty tracking, persistence, and neighbor queries.

For example, with a chunk size of `N`, the owning chunk coordinate is:

```text
chunkX = floor(tileX / N)
chunkY = floor(tileY / N)
localX = tileX - chunkX * N
localY = tileY - chunkY * N
```

The data layer should expose a dirty-chunk collection (preferably a reusable array or equivalent
iteration-friendly structure). A tile mutation marks its owning chunk dirty. If the mutation changes
neighbor masks, the adjacent chunks containing affected border tiles must also be marked dirty. The
data layer does not rebuild GPU data or know about buckets; it only owns tile state, chunk membership,
and invalidation.

## Dirty Chunk Cache

Rendering should consume a separate terrain cache layer. The cache receives the dirty chunks exposed
by the data layer, recomputes only those chunks' base and transition instance buffers, and persists the
results into the appropriate GPU buffers and `InstancedBucket` instances. It can retain cached buffers
for clean chunks and upload only changed ranges or replace the changed chunk's ranges as needed.

The cache should iterate the dirty-chunk collection, not every tile and not every chunk in the world.
After a dirty chunk has been rebuilt and its GPU data persisted, it is cleared from the dirty
collection according to the data layer's ownership protocol. Visibility changes may separately cause
the cache to submit or release already-built chunk buffers, but they should not turn normal rendering
into a full terrain scan.

This keeps the boundary explicit:

```text
terrain data layer -> dirty chunks -> terrain cache -> GPU buffers / InstancedBucket
```

The terrain data layer has no knowledge of renderers, GPU resources, or buckets. The cache is the only
layer that derives visual variants and persists them to the GPU. The render pass then draws the cache's
already-prepared buckets without iterating the terrain tile field like a sprite layer would.

## Why Not 50,000 Sprites?

Fifty thousand visible-looking tiles do not have to mean fifty thousand draw calls or fifty thousand
ECS entities. A sprite entity per cell would be the wrong cost model because it adds component
storage, query work, transform handling, lifecycle work, and render-queue overhead to something that
is fundamentally a dense field.

The renderer already has the more appropriate primitive: `InstancedBucket`. One bucket can draw many
quads with one instanced draw call, while each instance supplies position and tile/atlas information.
Terrain chunks also give us useful invalidation boundaries: changing one cell only rebuilds its chunk
and the neighboring chunk edges when necessary.

The first implementation should measure the actual visible-cell count and upload size, but it should
start from instancing rather than optimizing away an avoidable entity explosion later.

## Terrain Connectivity

For a hex cell, calculate a six-bit neighbor mask for each terrain family. The mask answers questions
such as “which neighboring cells are also water?” or “which neighboring cells belong to the same
grass region?” The mask selects one of the authored center, edge, corner, or transition variants.

There are two useful levels of sophistication:

1. **Binary terrain transitions:** render the current terrain with an edge overlay wherever a neighbor
   has a different terrain type. This is the best prototype because it needs a small atlas and makes
   the connectivity behavior easy to inspect.
2. **Full terrain rules:** select a complete tile variant from the six-neighbor mask, with symmetry
   reduction and artist-authored exceptions. This produces better corners and junctions once the art
   direction is stable.

For a hex grid, the mask should be based on the existing six-neighbor order in `Grid`, not on square
grid autotiling rules copied from another engine. Axial/cube coordinates are a good fit here because
the six directions are stable and neighbor calculations do not depend on row or column parity.

Do not make the visual variant authoritative. If an art revision changes the atlas or the mapping from
mask to tile, the saved world should not need to change.

## Overlap and Transitions

The BitCraft-like effect should be treated as an **overlapping transition layer**, not as every base
tile being enlarged until it covers its neighbors.

A practical draw order is:

1. Base terrain: one opaque or mostly opaque fill per cell.
2. Terrain transitions: edge/corner overlays whose geometry extends slightly into the adjacent cell.
3. Sparse variation: small decals, flowers, stones, shoreline details, and other non-authoritative
   visual noise.
4. Buildings, characters, and interaction/debug overlays.

The overlap amount must be tied to the actual hex spacing and atlas padding. It should be large enough
to hide hard seams but small enough that three-way junctions do not accumulate opaque wedges. Texture
bleeding also needs to be handled with atlas padding or a texture-array strategy.

Water should generally be a terrain family with its own fill and shoreline transitions, not a special
case in the grid renderer. A river is then just a connected water region. Its flow animation can be a
render-only shader treatment or a sparse animated overlay; it should not require changing terrain data
every frame.

## Recommended Data Model

Keep the authoritative representation compact and independent from art:

```ts
type TerrainKind = "grass" | "ice" | "water";

type TerrainCell = {
  readonly kind: TerrainKind;
};
```

The exact component/resource shape can wait until terrain simulation exists. The important choices are:

- Terrain is indexed by grid coordinate, not represented by a render entity per cell.
- Terrain kind, elevation, movement cost, fertility, and water behavior are simulation data as those
  fields are introduced.
- Atlas coordinates, variant ids, random cosmetic seeds, and chunk upload buffers are presentation data.
- A terrain edit invalidates the edited cell and its immediate neighbors, because their masks may change.

For world scale, partition the field into fixed-size chunks in grid space. A chunk owns a dense terrain
array; the render cache owns the corresponding GPU buffer. Keep a one-cell border or query neighboring
chunks when rebuilding, so transitions remain correct at chunk boundaries.

## First Terrain Generator

The first implementation should use only three terrain kinds so the data and dirty-cache path can be
trialed with a minimal visual vocabulary:

- `water` for noise values from `0` up to (but not including) `0.1`, shown in blue.
- `grass` for noise values from `0.1` up to (but not including) `0.8`, shown in green.
- `ice` for noise values from `0.8` through `1`, shown in white.

A deterministic Perlin-noise generator can assign the initial kind from each tile's grid coordinate.
The generator belongs to the terrain data layer and writes authoritative tile state; the colors and
visual variants belong to the cache/presentation side. This generator is only a proof of the data
flow and can later be replaced by persistence, streaming, or player-authored terrain without changing
the chunk or dirty-cache contracts.

## Rendering Shape

The likely first renderer is:

```text
world:terrain pass
  -> find visible terrain chunks
  -> derive base/transition instances from cell state and neighbors
  -> upload changed ranges to InstancedBucket
  -> draw one bucket per visual layer or atlas/material
```

The instance data can start with position, size, and atlas UV rectangle. Later it can add a mask or
variant index and let the shader derive UVs. Avoid rebuilding all visible instances every frame. Rebuild
on terrain edits, chunk visibility changes, atlas changes, or an intentional animation update.

The terrain pass remains read-only. It may derive masks and upload transient GPU data, but it must not
repair terrain state, create ECS entities, or write visual variants back into the world.

## Approaches Considered

### One sprite/entity per cell

Simple to understand and useful for a tiny prototype, but it scales poorly in this architecture. It
turns dense static data into a large number of ECS and render objects and makes terrain changes more
expensive than they need to be.

### One giant pre-rendered texture

Very cheap to draw, but difficult to update in a persistent multiplayer world. A local edit can force
large texture regeneration, and zooming or camera movement can make resolution and streaming awkward.
It may still be useful as a far-distance or minimap representation.

### Tilemap-style CPU batches

A strong option and close to what engines such as Godot and Unity expose. Grouping cells into rendering
quadrants/chunks is the key optimization, not the editor-facing name “tilemap”. This is a good fallback
if the custom instanced path becomes awkward, but the current engine's `InstancedBucket` makes a custom
version viable without introducing a new scene abstraction.

### GPU procedural terrain from a texture/grid buffer

Potentially the best long-term bandwidth profile for enormous, mostly static regions: upload terrain
ids to a GPU texture or buffer and let a shader sample neighbors. It is also harder to debug, more
coupled to WebGL capabilities, and less flexible for irregular transition art. It should be considered
after the chunked instanced version has real profiling data.

## Proposed Milestones

### 1. Visual proof

Create a small in-memory terrain field with grass, ice, and water from deterministic Perlin noise.
Render one base instance and one transition overlay instance per visible cell. Include debug coloring
for terrain kind and neighbor mask.

Success means we can draw a river crossing grass with stable seams and inspect the mask at the hovered
cell.

### 2. Chunked terrain storage

Add fixed-size chunks, floor-based negative-coordinate mapping, and a terrain lookup that can read
across chunk boundaries. Expose a dirty-chunk array, mark owning and affected border chunks on edits,
and have the cache rebuild only those chunks plus affected neighbors. Add a small benchmark for dirty
chunk count, rebuild time, and upload bytes.

### 3. Art-quality terrain rules

Replace the prototype overlay mapping with an authored six-neighbor terrain atlas. Add symmetry-aware
variant selection and deterministic cosmetic variation based on cell coordinates.

### 4. World integration

Connect terrain to persistence, streaming, collision/movement cost, water behavior, and editor tools.
At this point the terrain renderer should remain a consumer of those systems rather than owning their
state.

## Conclusion

The desired direction is not “render every terrain tile as a sprite”. It is “model terrain per cell,
render it as a batched field, and use neighbor-aware transition layers to make the field feel
continuous”. That preserves the strong part of the BitCraft-like idea while leaving room for the
world scale and simulation depth described in the project philosophy.

## References

- [Godot TileMap documentation](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilemaps.html)
  describes optimized large tile layouts, multiple layers, rendering quadrants, and terrain
  connections.
- [Tiled terrain and automapping documentation](https://doc.mapeditor.org/en/stable/manual/automapping/)
  describes rule-based placement, local automapping radius, deterministic rule inputs, and random
  cosmetic outputs.
- [Red Blob Games hexagonal grids](https://www.redblobgames.com/grids/hexagons/) documents axial/cube
  coordinates, six-direction neighbors, hex-to-pixel conversion, and chunk/storage considerations.
- [BitCraft Online](https://bitcraftonline.com/) provides the relevant reference point for a shared,
  persistent, player-shaped world rather than a static level tilemap.