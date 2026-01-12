import { createSystem, useEngine, useSystem } from '@repo/engine';
import type { EngineSystem } from '@repo/engine/core/register/system';
import { z } from 'zod';

/***** SCHEMA *****/
const schema = z.object({
  fps: z.array(z.number()),
  ups: z.array(z.number()),
  buffer: z.object({
    start: z.number(),
    frames: z.number(),
    updates: z.number(),
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
        buffer: { start: performance.now(), frames: 0, updates: 0 }, 
        fps: [],
        ups: []
      }
    }
  });

  function EntryPoint() {
    const engine = useEngine();
    const { data } = useSystem<EngineSystem<typeof schema>>("engine:fps-counter");
    const now = performance.now();

    if (engine.frame.phase("update")) {
      data.buffer.updates++;
    }
    
    if (engine.frame.phase("render")) {
      data.buffer.frames++;

      // Check if 1 second has passed
      if (now - data.buffer.start >= 1000) {
        const elapsedSec = (now - data.buffer.start) / 1000;
        
        data.fps.push(data.buffer.frames / elapsedSec);
        data.ups.push(data.buffer.updates / elapsedSec);

        // Reset buffer
        data.buffer.start = now;
        data.buffer.frames = 0;
        data.buffer.updates = 0;

        // Keep only the last barCount entries
        if (data.fps.length > barCount) data.fps.shift();
        if (data.ups.length > barCount) data.ups.shift();

        // Update UI
        updateDisplay(data);
      }
    }
  }

  function Initialize() {
    const { data } = useSystem<EngineSystem<typeof schema>>("engine:fps-counter")
    
    // Clear any existing data
    data.fps = [];
    data.ups = [];
    data.buffer = { start: performance.now(), frames: 0, updates: 0 };

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
    const fpsValue = data.fps.length > 0 ? data.fps[data.fps.length - 1] : 0;
    const upsValue = data.ups.length > 0 ? data.ups[data.ups.length - 1] : 0;
    
    const fpsAvg = data.fps.length > 0 
      ? (data.fps.reduce((a, b) => a + b, 0) / data.fps.length).toFixed(1)
      : '--';
    const upsAvg = data.ups.length > 0
      ? (data.ups.reduce((a, b) => a + b, 0) / data.ups.length).toFixed(1)
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
    data.fps.forEach((value, index) => {
      const x = index * barWidth;
      const height = (value / maxValue) * canvas.height;
      const y = canvas.height - height;
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), height);
    });

    // Draw UPS (Cyan, slightly offset or overlaid)
    // To make them visible, we'll draw UPS as a thin line or another bar? 
    // Let's draw UPS as a blue bar with some transparency, maybe slightly thinner or just overlaid
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    data.ups.forEach((value, index) => {
      const x = index * barWidth;
      const height = (value / maxValue) * canvas.height;
      const y = canvas.height - height;
      // Draw UPS slightly thinner to distinguish? or just normal. 
      // Overlaid is fine.
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), height);
    });
  }
}

