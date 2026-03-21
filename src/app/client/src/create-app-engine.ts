import { Loader } from "@client/assets";
import { createAppEngineLoadingOverlay } from "@client/overlays/create-app-engine-overlays";
import { Render } from "@client/render";
import { Scene as E2eScene } from "@client/scenes/e2e";
import { Scene as MainScene } from "@client/scenes/world";
import { System as Initialize } from "@client/systems/core/initialisation";
import { invariantById } from "@client/utilities/selectors";
import * as Engine from "@engine";

export const createAppEngine = () => {
  const rootElement = invariantById<HTMLDivElement>("game");

  // prettier-ignore
  return Engine.createEngine({
    rootElement,
    assetLoader: Loader,
    loading: createAppEngineLoadingOverlay(),
    initialization: Initialize,
    render: Render,
    scenes: [
      MainScene,
      E2eScene,
    ],
    config: {
      render: {
        culling: {
          enabled: true,
          viewportScaleX: 0.95,
          viewportScaleY: 0.95,
          debugOutline: false,
        },
      },
      serialization: {
        enableDirtyQueue: true,
      },
    },
  });
};
