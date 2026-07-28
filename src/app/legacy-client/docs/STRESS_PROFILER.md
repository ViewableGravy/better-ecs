# Stress profiler

The `BenchmarkScene` provides the `sprite-dynamic-50` baseline. Every requested entity owns a real
`Transform2D` and `Sprite`; every second transform moves from the deterministic engine update tick.
All sprites share one texture and are laid out inside the active camera.

Before RAF sampling, each run compares two-component traversal strategies over the dense
`Transform2D + Sprite` layout and a 10%-selective `Transform2D + BenchmarkQueryMarker` layout. The
comparison records duration, nanoseconds per match, and equivalent-work checksums for overloaded
`forEach`, the reusable cursor prototype, `query + get`, and a tuple-yielding iterator. The selective
marker uses one shared read-only value and is removed before frame sampling, so the established
`sprite-dynamic-50` component membership is restored before the RAF comparison.

Open the application and choose **Go to Stress Profiler**, or enter it directly:

```text
http://127.0.0.1:3000/?benchmark=stress
```

The scene exposes buttons for 10k, 100k, 500k, 1M, 2M, and 5M entities. Construction is chunked so
progress and allocation failure remain visible. Construction reports both active CPU work and
wall-clock time to interactive. RAF pacing sampling records average, median, p95, p99, jank counts,
update ticks, motion-system executions, and a deterministic simulation checksum. RAF pacing is an
end-to-end responsiveness measure; internal update/render/GPU phase timings are a later profiler
instrumentation step.

Run the automated 100k and 500k matrix:

```bash
bun run benchmark:stress
```

For a quick 10k validation:

```bash
bun run benchmark:stress:smoke
```

The runner builds the production client, starts a local preview, uses a fresh browser context for
every target, captures JavaScript heap and GPU/browser metadata through Chromium, checks the fixture
and sample, and writes an incremental JSON report to `benchmark-results/`. It exits non-zero when
any scenario fails. Hardware-backed WebGL is required by default; the runner fails if Chromium
selects SwiftShader or another known software renderer. Use `--software-gpu` for an intentional
software-renderer comparison:

```bash
bun scripts/run-stress-benchmark.ts --smoke --software-gpu
```

Set `BENCHMARK_URL` to use an already-running server instead.

## Current expected ceiling

Entity IDs are monotonic positive safe integers scoped to a scene, so the former 1,048,575
lifetime-created ceiling no longer limits the 2M and 5M scenarios. Destroyed IDs are not reused.
At these scales, memory, construction time, simulation work, and rendering should now fail before
entity identity.

This profile is deliberately a heavy baseline, not a claim that every visible conveyor item should
remain a full object-based ECS entity. Later profiles should compare packed conveyor presentation,
static sprites, off-screen populations, and simulation-only populations against this result.
