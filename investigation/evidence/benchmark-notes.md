# Browser performance benchmark notes

## Environment

- Date: 2026-07-23 (Australia/Sydney; raw JSON timestamp is UTC).
- Source commit: `3f8b91e`.
- Working tree: `/home/gravy/programming/better-ecs`.
- Bun: `1.2.18`.
- System `node`: `v12.22.9`; it cannot parse the installed Vite 8 entry point, so Vite was invoked with Bun directly.
- Browser: Playwright Chromium at
  `/home/gravy/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`.
- WebGL backend reported by the completed run: ANGLE/Vulkan using SwiftShader
  `SwiftShader Device (Subzero)`, not physical GPU hardware.
- Browser viewport/canvas: 1280 × 720.

## Commands

Development server:

```sh
/home/gravy/.bun/bin/bun node_modules/vite/bin/vite.js \
  --config vite.config.ts --host 127.0.0.1 --port 6100 --strictPort
```

Production build:

```sh
/home/gravy/.bun/bin/bun node_modules/vite/bin/vite.js build --config vite.config.ts
```

The build completed in 500 ms. Its principal JS output was 384.24 kB
uncompressed / 106.59 kB gzip. This is build evidence, not a frame-performance
measurement.

Production preview:

```sh
/home/gravy/.bun/bin/bun node_modules/vite/bin/vite.js preview \
  --config vite.config.ts --host 127.0.0.1 --port 6101 --strictPort
```

The checked-in `ecs-query-benchmark-results.jsonl` contains one JSON object per
run. This is an extracted-algorithm benchmark, not the application ECS running
inside Chromium; see `03-ecs-and-allocations.md` for the runner limitation.
The one-off extracted benchmark and isolated WebGL harnesses were removed after
the investigation because they duplicated production algorithms and contained
machine-local browser configuration. The maintained stress runner is now
`scripts/run-stress-benchmark.ts`.

## Retained artifacts

- `measurements/webgl-isolation.json`: raw results and full launch/backend
  metadata.
- `measurements/ecs-query-benchmark-results.jsonl`: raw extracted-algorithm
  results used by the ECS report.
- `measurements/ecs-static-scan.txt`: exact source scan and allocation formulas.

No application trace or application screenshot is retained. Do not infer
application frame timings from the WebGL isolation results.

## Failed/capped attempts

1. Running Vite with `bun x` delegated to the system Node 12 and failed on
   optional chaining in Vite 8. Direct Bun invocation worked.
2. Listening inside the filesystem sandbox was reported as every port being in
   use. The local-only server was restarted with approved network isolation
   escalation.
3. A high-repetition synchronized SwiftShader run exceeded the time cap and was
   interrupted before serialization.
4. A reduced run completed evaluation but was interrupted while Playwright was
   waiting for a post-run screenshot; results had not yet been serialized.
5. The development application loaded its scene-selection UI, but the E2E
   scene harness did not become available within three 5-second attempts.
   Therefore no trustworthy application frame trace, frame-time variance,
   heap-growth, or real ECS iteration result was retained.
6. The final run removed the screenshot, serialized immediately after
   evaluation, and was hard-capped at 120 seconds. It completed in about 18
   seconds.

## Interpretation constraints

- Rebuild, CPU position, and culling results use two retained measured
  repetitions. Upload completion uses one or two repetitions depending on the
  row. This is enough to expose order of magnitude and scaling, not stable
  hardware-independent distributions.
- Browser timers quantized some small operations to `0` or `0.1` ms. A zero is
  below timer resolution, not free work.
- The 500k draw paths have one measured repetition. Although
  `EXT_disjoint_timer_query_webgl2` was available, the bounded harness did not
  collect timer-query results. The near-zero CPU wall times are not accepted as
  proof of GPU throughput.
- SwiftShader makes upload and draw values unsuitable for predicting a user's
  physical GPU. CPU typed-array construction remains directionally useful.
- The harness has no texture sampling, alpha blending, render sorting, ECS
  traversal, transform hierarchy, or conveyor simulation. It isolates only the
  named stages.
