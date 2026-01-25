import type { Opts } from ".";
import { schema } from "."
import { useOverloadedSystem,type EngineSystem, useSystem, matchKeybind } from "@repo/engine";


export function update(opts: Opts) {
  const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("engine:fps-counter");
  const now = performance.now();

  // Toggle simple mode via engine input if a keybind was provided
  if (opts.simpleModeToggleKey) {
    try {
      const input = useSystem("engine:input") as any;
      if (input?.data && matchKeybind(opts.simpleModeToggleKey, input.data, 'pressed')) {
        const container = opts.element.querySelector('.FPS__container');
        if (container) container.classList.toggle('FPS__container--simple');
      }
    } catch (e) {
      // swallow if input system not available in this context
    }
  }

  data.upsBuffer.updates++;

  // Check if rate has passed (UPS calculation in update phase)
  if (data.upsBuffer.start! + 1000 > now) return;

  const elapsedSec = (now - data.upsBuffer.start!) / 1000;
  data.ups.push(data.upsBuffer.updates / elapsedSec);

  // Keep only the last barCount entries
  if (data.ups.length > (opts.barCount ?? 60)) data.ups.shift();
  
  // Reset UPS buffer
  data.upsBuffer.start = now;
  data.upsBuffer.updates = 0;
}