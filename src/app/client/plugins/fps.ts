import { invariantById } from "@client/utilities/selectors";
import { createFPS } from "@lib/fps";

const fps = createFPS({
  element: invariantById("fps-counter"),
  round: true,
  rate: 1000,
  modeToggleKey: {
    code: "KeyF",
    modifiers: {
      ctrl: true,
      shift: true,
    },
  },
});

export const FPSSystem = fps.system;
export const FPSPass = fps.pass;
