import {
  BELT_STRESS_ITEM_COUNTS,
  BELT_STRESS_PROFILE_ID,
} from "@legacy/scenes/belt-stress/config";
import type { BeltStressController } from "@legacy/scenes/belt-stress/controller";
import type { BeltStressStatus } from "@legacy/scenes/belt-stress/types";
import type { AnyEngine } from "@engine";

export function mountBeltStressControls(controller: BeltStressController, engine: AnyEngine): () => void {
  const root = document.createElement("section");
  root.id = "belt-stress-controls";
  root.style.cssText = [
    "position:absolute", "top:10px", "right:10px", "z-index:1000", "width:330px", "padding:12px",
    "border-radius:8px", "background:rgba(12, 16, 24, 0.92)", "color:#f6f7fb",
    "font:13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
  ].join(";");
  root.innerHTML = `
    <div style="font-weight:700; margin-bottom:4px;">Worker belt stream</div>
    <div style="color:#aeb8ca; margin-bottom:10px;">${BELT_STRESS_PROFILE_ID}</div>
    <div id="belt-stress-targets" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
    <pre id="belt-stress-status" style="margin:10px 0 0; white-space:pre-wrap;"></pre>
  `;

  const parent = engine.canvas.parentElement;
  if (!parent) {
    throw new Error("Engine canvas must have a parent element for belt stress controls.");
  }
  parent.append(root);
  const targets = requireElement(root, "belt-stress-targets");
  const status = requireElement(root, "belt-stress-status");

  for (const count of BELT_STRESS_ITEM_COUNTS) {
    const button = document.createElement("button");
    button.textContent = count >= 1_000_000 ? `${count / 1_000_000}M` : `${count / 1_000}k`;
    button.style.cssText = "padding:4px 7px;";
    button.onclick = () => controller.configure(count);
    targets.append(button);
  }

  controller.setStatusListener(renderStatus);
  const refreshTimer = window.setInterval(() => renderStatus(controller.status()), 250);

  function renderStatus(value: BeltStressStatus): void {
    status.textContent = [
      `items: ${value.itemCount.toLocaleString()}`,
      `static belts: ${value.beltCount.toLocaleString()}`,
      `worker tick: ${value.workerTick.toLocaleString()}`,
      `worker simulation: ${value.simulationTimeMs.toFixed(2)} ms`,
      `skipped snapshots: ${value.skippedPublications.toLocaleString()}`,
      `position upload: ${value.render.lastUploadMs.toFixed(3)} ms`,
      `draw submission: ${value.render.lastDrawSubmissionMs.toFixed(3)} ms`,
      `RAF interval (EMA): ${value.render.frameIntervalMs.toFixed(2)} ms`,
      `uploaded total: ${(value.render.uploadedBytes / 1_000_000).toFixed(2)} MB`,
      `position uploads: ${value.render.uploadCount.toLocaleString()}`,
      `draw calls/frame: ${value.render.drawCalls}`,
      `checksum: ${value.checksum.toFixed(2)}`,
    ].join("\n");
  }

  return () => {
    window.clearInterval(refreshTimer);
    root.remove();
  };
}

function requireElement(parent: ParentNode, id: string): HTMLElement {
  const element = parent.querySelector<HTMLElement>(`#${id}`);
  if (!element) {
    throw new Error(`Belt stress control "${id}" was not mounted.`);
  }

  return element;
}
