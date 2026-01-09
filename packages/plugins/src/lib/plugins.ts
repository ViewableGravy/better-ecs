import { createSystem, useEngine, useSystem } from '@repo/engine';
import { z } from 'zod';

/***** SCHEMA *****/
const schema = z.object({
  frames: z.array(z.number()).default([]),
  updates: z.array(z.number()).default([]),
});

type FPSCounterData = z.infer<typeof schema>;

/***** TYPE DEFINITIONS *****/
type Opts = {
  element: HTMLElement;
  maxSamples?: number;
};

// declare module '@repo/engine' {
//   interface Register {
//     Engine: EngineClass<[ReturnType<typeof System>]>;
//   }
// }

export const System = (opts: Opts) => {
  const maxSamples = opts.maxSamples ?? 300; // ~10 seconds at 30 fps

  return createSystem("engine:fps-counter")({
    system: EntryPoint,
    initialize: Initialize,
    schema: {
      default: { frames: [], updates: [] },
      schema: schema
    }
  });

  function EntryPoint() {
    const engine = useEngine();
    const { data } = useSystem("engine:fps-counter")
    
    // Record current frame stats
    data.frames.push(engine.frame.fps);
    data.updates.push(engine.frame.ups);

    // Keep only the last maxSamples entries
    if (data.frames.length > maxSamples) {
      data.frames.shift();
    }
    if (data.updates.length > maxSamples) {
      data.updates.shift();
    }

    // Update UI
    updateDisplay(data);
  }

  function Initialize() {
    const { data } = useSystem("engine:fps-counter")
    
    // Clear any existing data
    data.frames = [];
    data.updates = [];

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
    const fpsValue = data.frames.length > 0 ? data.frames[data.frames.length - 1] : 0;
    const upsValue = data.updates.length > 0 ? data.updates[data.updates.length - 1] : 0;
    
    const fpsAvg = data.frames.length > 0 
      ? (data.frames.reduce((a, b) => a + b, 0) / data.frames.length).toFixed(1)
      : '--';
    const upsAvg = data.updates.length > 0
      ? (data.updates.reduce((a, b) => a + b, 0) / data.updates.length).toFixed(1)
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

    // Draw bars for FPS
    if (data.frames.length > 0) {
      const barWidth = Math.max(1, canvas.width / data.frames.length);
      const maxValue = 120; // Reasonable max for scaling

      ctx.fillStyle = '#0f0';
      data.frames.forEach((value, index) => {
        const x = index * barWidth;
        const height = (value / maxValue) * canvas.height;
        const y = canvas.height - height;
        ctx.fillRect(x, y, Math.max(1, barWidth - 1), height);
      });
    }
  }
}

