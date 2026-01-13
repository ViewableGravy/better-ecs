# ECS Engine Improvements TODO

- [ ] **Show target framerate/UPS**: Display the target values alongside current metrics for better comparison.
- [ ] **Merge FPS/UPS logic**: Refactor the logic for tracking frames per second and updates per second into a unified metric system, as they share the same underlying implementation.
- [ ] **Dynamic bar coloring**: Implement color thresholds based on performance relative to target:
    - Yellow: Below 80% of target
    - Orange: Below 60% of target
    - Red: Below 40% of target
- [ ] **Persistent state across hot reloads**: Ensure the metrics history (bars) survives Vite hot reloads. This allows observation of performance impacts caused by code changes without the graph resetting.
- [ ] **Evaluate and implement `rate` parameter usage**:
    - Dictate the frequency of bar updates.
    - **Note on implementation**: Investigating ways to measure sub-frame intervals decoupled from the display's refresh rate (Hz). If locked to the refresh rate, measuring small intervals becomes difficult due to JS timing resolution at high frequencies (e.g., 8ms vs 16ms jitter).
