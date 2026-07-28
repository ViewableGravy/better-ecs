import { Loader } from "@client/assets";
import { createAppEngineLoadingOverlay } from "@client/overlays/create-app-engine-loading-overlay";
import { Render } from "@client/render";
import { Scene as MainScene } from "@client/scenes/main";
import { Initialization } from "@client/systems/initialization";
import { invariantById } from "@client/utilities/selectors";
import * as Engine from "@engine";

export const createAppEngine = () => Engine.createEngine({
  rootElement: invariantById<HTMLDivElement>("game"),
  assetLoader: Loader,
  loading: createAppEngineLoadingOverlay(),
  initialization: Initialization,
  render: Render,
  scenes: [MainScene],
  initialScene: "MainScene",
  config: {
    render: {
      culling: {
        enabled: true,
        viewportScaleX: 0.95,
        viewportScaleY: 0.95,
        debugOutline: false,
      },
    },
  },
});
