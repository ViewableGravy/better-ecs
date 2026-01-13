import { createSystem, useEngine, useSystem } from '@repo/engine';
import type { EngineSystem } from '@repo/engine/core/register/system';
import { z } from 'zod';

/***** SCHEMA *****/
const schema = z.object({
  fps: z.array(z.number()),
  ups: z.array(z.number()),
  fpsBuffer: z.object({
    start: z.number().nullable(),
    frames: z.number(),
  }),
  upsBuffer: z.object({
    start: z.number().nullable(),
    updates: z.number(),
  }),
});

type FPSCounterData = z.infer<typeof schema>;

/***** TYPE DEFINITIONS *****/
type Opts = {
  element: HTMLElement;
  barCount?: number;
  rate?: number;
  round?: boolean;
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
        fpsBuffer: { start: null, frames: 0 }, 
        upsBuffer: { start: null, updates: 0 }, 
        fps: [],
        ups: []
      }
    }
  });

  function EntryPoint() {
    const engine = useEngine();
    const { data } = useSystem<EngineSystem<typeof schema>>("engine:fps-counter");
    const now = performance.now();

    if (!data.upsBuffer.start) {
      data.upsBuffer.start = now;
    }
    if (!data.fpsBuffer.start) {
      data.fpsBuffer.start = now;
    }

    if (engine.frame.phase("update")) {
      data.upsBuffer.updates++;

      // Check if rate has passed (UPS calculation in update phase)
      if (data.upsBuffer.start + 1000 > now) return;

      const elapsedSec = (now - data.upsBuffer.start) / 1000;
      data.ups.push(data.upsBuffer.updates / elapsedSec);

      // Keep only the last barCount entries
      if (data.ups.length > barCount) data.ups.shift();
      
      // Reset UPS buffer
      data.upsBuffer.start = now;
      data.upsBuffer.updates = 0;
      return;
    }
    
    if (engine.frame.phase("render")) {
      data.fpsBuffer.frames++;

      if (data.fpsBuffer.start + 1000 > now) return;

      // Check if 1 second has passed (FPS calculation in render phase)
      const elapsedSec = (now - data.fpsBuffer.start) / 1000;
      
      data.fps.push(data.fpsBuffer.frames / elapsedSec);

      // Keep only the last barCount entries
      if (data.fps.length > barCount) data.fps.shift();

      // Reset FPS buffer
      data.fpsBuffer.start = now;
      data.fpsBuffer.frames = 0;

      // Update UI
      updateDisplay(data);
    }
  }

  function Initialize() {
    opts.element.innerHTML = /* html */`
      <div style="background: rgba(0,0,0,0.7); color: #0f0; font-family: monospace; padding: 10px; font-size: 12px; border-radius: 4px; max-width: 300px;">
        <div style="margin-bottom: 10px;">
          <div>FPS: <span id="fps-value">--</span> (avg: <span id="fps-avg">--</span>)</div>
          <canvas id="fps-canvas" width="280" height="50" style="border: 1px solid #0f0; display: block; margin-bottom: 8px;"></canvas>
          <div>UPS: <span id="ups-value">--</span> (avg: <span id="ups-avg">--</span>)</div>
          <canvas id="ups-canvas" width="280" height="50" style="border: 1px solid #0f0; display: block;"></canvas>
        </div>
      </div>
    `;
  }

  function updateDisplay(data: FPSCounterData) {
    // Update text values
    const fpsValue = data.fps.length > 0 ? data.fps[data.fps.length - 1] : 0;
    const upsValue = data.ups.length > 0 ? data.ups[data.ups.length - 1] : 0;
    
    const fpsAvg = data.fps.length > 0 
      ? (data.fps.reduce((a, b) => a + b, 0) / data.fps.length)
      : 0;
    const upsAvg = data.ups.length > 0
      ? (data.ups.reduce((a, b) => a + b, 0) / data.ups.length)
      : 0;

    const fpsValueEl = opts.element.querySelector('#fps-value');
    const fpsAvgEl = opts.element.querySelector('#fps-avg');
    const upsValueEl = opts.element.querySelector('#ups-value');
    const upsAvgEl = opts.element.querySelector('#ups-avg');

    const formatNumber = (num: number) => opts.round ? Math.round(num).toString() : num.toFixed(1);

    if (fpsValueEl) fpsValueEl.textContent = formatNumber(fpsValue);
    if (fpsAvgEl) fpsAvgEl.textContent = formatNumber(fpsAvg);
    if (upsValueEl) upsValueEl.textContent = formatNumber(upsValue);
    if (upsAvgEl) upsAvgEl.textContent = formatNumber(upsAvg);

    // Draw chart
    drawChart(data);
  }

  function drawChart(data: FPSCounterData) {
    // Draw FPS chart
    const fpsCanvas = opts.element.querySelector('#fps-canvas') as HTMLCanvasElement;
    if (fpsCanvas) {
      const ctx = fpsCanvas.getContext('2d');
      if (ctx) {
        drawBarChart(ctx, fpsCanvas, data.fps, 'rgba(0, 255, 0, 0.7)');
      }
    }

    // Draw UPS chart
    const upsCanvas = opts.element.querySelector('#ups-canvas') as HTMLCanvasElement;
    if (upsCanvas) {
      const ctx = upsCanvas.getContext('2d');
      if (ctx) {
        drawBarChart(ctx, upsCanvas, data.ups, 'rgba(0, 255, 255, 0.7)');
      }
    }
  }

  function drawBarChart(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, values: number[], color: string) {
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

    ctx.fillStyle = color;
    values.forEach((value, index) => {
      const x = index * barWidth;
      const height = (value / maxValue) * canvas.height;
      const y = canvas.height - height;
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), height);
    });
  }
}

