import { schema, type Opts, type FPSCounterData } from "./types";
import { useOverloadedSystem, useEngine, type EngineSystem } from "@repo/engine";

export function render(opts: Opts) {
  const now = performance.now();
  const engine = useEngine();
  const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");

  data.fpsBuffer.frames++;

  if (data.fpsBuffer.start! + 1000 > now) return;

  // Check if 1 second has passed (FPS calculation in render phase)
  const elapsedSec = (now - data.fpsBuffer.start!) / 1000;
  
  // Start collecting samples immediately (no wait period)
  data.fps.push(data.fpsBuffer.frames / elapsedSec);

  // Keep only the last barCount entries
  if (data.fps.length > (opts.barCount ?? 60)) data.fps.shift();

  // Reset FPS buffer
  data.fpsBuffer.start = now;
  data.fpsBuffer.frames = 0;

  // Update UI
  if (data.fps.length === 0) return;

  const fps = data.fps;
  const currentFps = fps[fps.length - 1];
  
  // Check if simple mode is active via class
  const isSimpleMode = opts.element.querySelector('.FPS__container--simple');

  // Always update current FPS
  const setVal = (id: string, val: number | string) => {
      const el = opts.element.querySelector(id);
      if (el) el.textContent = typeof val === 'number' ? Math.round(val).toString() : val;
  };
  
  setVal('#fps-current', currentFps);

  if (isSimpleMode) return; // Skip updating charts and other text in simple mode

  // Sort for percentiles
  const sortedFps = [...fps].sort((a, b) => a - b);
  
  const [min] = sortedFps;
  const max = sortedFps[sortedFps.length - 1];
  const avg = fps.reduce((a, b) => a + b, 0) / fps.length;
  
  // 1% low
  const index1Low = Math.floor(sortedFps.length * 0.01);
  const low1 = sortedFps[Math.max(0, index1Low)];
  
  // 0.1% low
  const index01Low = Math.floor(sortedFps.length * 0.001);
  const low01 = sortedFps[Math.max(0, index01Low)];

  // Frame Time calculation (from current FPS)
  const frameTime = 1000 / (currentFps || 60);

  const setBar = (id: string, val: number, maxVal: number) => {
      const el = opts.element.querySelector(id) as HTMLElement;
      if (el) {
          const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
          el.style.setProperty('--bar-width', `${pct}%`);
      }
  }

  setVal('#frametime-value', frameTime.toFixed(1));
  
  setVal('#val-avg', avg);
  setVal('#val-max', max);
  setVal('#val-min', min);
  setVal('#val-1low', low1);
  setVal('#val-01low', low01);

  // Percentage should be out of the maximum fps of the engine (target)
  const targetFps = engine.frame.fps || 60;
  const barScale = targetFps;
  
  setBar('#bar-avg', avg, barScale);
  setBar('#bar-max', max, barScale);
  setBar('#bar-min', min, barScale);
  setBar('#bar-1low', low1, barScale);
  setBar('#bar-01low', low01, barScale);
}