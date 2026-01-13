import { createSystem, useEngine, useSystem } from '@repo/engine';
import type { EngineSystem } from '@repo/engine/core/register/system';
import { z } from 'zod';

/***** SCHEMA *****/
const schema = z.object({
  fps: z.object({
    bars: z.array(z.number()),
    buffer: z.object({
      start: z.number(),
      count: z.number(),
    }),
  }),
  ups: z.object({
    bars: z.array(z.number()),
    buffer: z.object({
      start: z.number(),
      count: z.number(),
    }),
  }),
});

type FPSCounterData = z.infer<typeof schema>;

/***** TYPE DEFINITIONS *****/
type Opts = {
  element: HTMLElement;
  barCount?: number;
};

export const System = (opts: Opts) => {
  const barCount = opts.barCount ?? 60; // Fixed number of bars to display

  return createSystem("engine:fps-counter")({
    system: EntryPoint,
    initialize: Initialize,
    priority: 1,
    phase: "all",
    schema: {
      schema: schema,
      default: { 
        fps: { bars: [], buffer: { start: performance.now(), count: 0 } },
        ups: { bars: [], buffer: { start: performance.now(), count: 0 } },
      }
    }
  });

  function EntryPoint() {
    const engine = useEngine();
    const { data } = useSystem<EngineSystem<typeof schema>>("engine:fps-counter");

    let needsUpdate = false;

    if (engine.frame.phase("update")) {
      if (handle(data.ups)) needsUpdate = true;
    }
    
    if (engine.frame.phase("render")) {
      if (handle(data.fps)) needsUpdate = true;

      // Update UI if either segment rolled over
      if (needsUpdate) {
        updateDisplay(data);
      }
    }
  }

  function handle(segment: { bars: number[], buffer: { start: number, count: number } }) {
    segment.buffer.count++;
    const now = performance.now();

    // Check if 1 second has passed
    if (now - segment.buffer.start >= 1000) {
      const elapsedSec = (now - segment.buffer.start) / 1000;
      
      segment.bars.push(segment.buffer.count / elapsedSec);

      // Reset buffer
      segment.buffer.start = now;
      segment.buffer.count = 0;

      // Keep only the last barCount entries
      if (segment.bars.length > barCount) segment.bars.shift();
      
      return true;
    }
    return false;
  }

  function Initialize() {
    const { data } = useSystem<EngineSystem<typeof schema>>("engine:fps-counter")
    
    // Clear any existing data
    data.fps = { bars: [], buffer: { start: performance.now(), count: 0 } };
    data.ups = { bars: [], buffer: { start: performance.now(), count: 0 } };

    // Setup initial display
    setupDisplay();
  }

  function setupDisplay() {
    opts.element.innerHTML = /* html */`
      <div style="background: rgba(0,0,0,0.7); color: #0f0; font-family: monospace; padding: 10px; font-size: 12px; border-radius: 4px; max-width: 300px;">
        <div style="margin-bottom: 10px;">
          <div>FPS: <span id="fps-value">--</span> (avg: <span id="fps-avg">--</span>)</div>
          <div>UPS: <span id="ups-value">--</span> (avg: <span id="ups-avg">--</span>)</div>
        </div>
        <canvas id="fps-canvas" width="280" height="60" style="border: 1px solid #0f0; display: block;"></canvas>
      </div>
    `;
  }

  function updateDisplay(data: FPSCounterData) {
    // Update text values
    const fpsValue = data.fps.bars.length > 0 ? data.fps.bars[data.fps.bars.length - 1] : 0;
    const upsValue = data.ups.bars.length > 0 ? data.ups.bars[data.ups.bars.length - 1] : 0;
    
    const fpsAvg = data.fps.bars.length > 0 
      ? (data.fps.bars.reduce((a, b) => a + b, 0) / data.fps.bars.length).toFixed(1)
      : '--';
    const upsAvg = data.ups.bars.length > 0
      ? (data.ups.bars.reduce((a, b) => a + b, 0) / data.ups.bars.length).toFixed(1)
      : '--';

    const fpsValueEl = opts.element.querySelector('#fps-value');
    const fpsAvgEl = opts.element.querySelector('#fps-avg');
    const upsValueEl = opts.element.querySelector('#ups-value');
    const upsAvgEl = opts.element.querySelector('#ups-avg');

    if (fpsValueEl) fpsValueEl.textContent = fpsValue.toFixed(1);
    if (fpsAvgEl) fpsAvgEl.textContent = fpsAvg as string;
    if (upsValueEl) upsValueEl.textContent = upsValue.toFixed(1);
    if (upsAvgEl) upsAvgEl.textContent = upsAvg as string;

    // Draw chart
    drawChart(data);
  }

  function drawChart(data: FPSCounterData) {
    const canvas = opts.element.querySelector('#fps-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(0,255,0,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (canvas.height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw bars
    const barWidth = canvas.width / barCount;
    const maxValue = 120; // Reasonable max for scaling

    // Draw FPS (Green)
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    data.fps.bars.forEach((value, index) => {
      const x = index * barWidth;
      const height = (value / maxValue) * canvas.height;
      const y = canvas.height - height;
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), height);
    });

    // Draw UPS (Cyan, slightly offset or overlaid)
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    data.ups.bars.forEach((value, index) => {
      const x = index * barWidth;
      const height = (value / maxValue) * canvas.height;
      const y = canvas.height - height;
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), height);
    });
  }
}

