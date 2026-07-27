import { Loader } from "@client/assets";
import { createAppEngineLoadingOverlay } from "@client/overlays/create-app-engine-overlays";
import { Render } from "@client/render";
import { Scene as BeltStressScene } from "@client/scenes/belt-stress";
import { Scene as BenchmarkScene } from "@client/scenes/benchmark";
import { Scene as ConveyorWorkerScene } from "@client/scenes/conveyor-worker/scene";
import { Scene as E2eScene } from "@client/scenes/e2e";
import { Scene as MainScene } from "@client/scenes/world";
import { Scene as RetainedStressScene } from "@client/scenes/retained-stress";
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
      BenchmarkScene,
      BeltStressScene,
      ConveyorWorkerScene,
      RetainedStressScene,
    ],
    initialScene: resolveInitialScene(),
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
};

function resolveInitialScene(): "MainScene" | "BenchmarkScene" | "BeltStressScene" | "ConveyorWorkerScene" | "RetainedStressScene" {
  const benchmark = new URLSearchParams(window.location.search).get("benchmark");
  if (benchmark === "belts") {
    return "BeltStressScene";
  }

  if (benchmark === "conveyor-worker") {
    return "ConveyorWorkerScene";
  }

  if (benchmark === "stress") {
    return "BenchmarkScene";
  }

  if (benchmark === "retained") {
    return "RetainedStressScene";
  }

  return "MainScene";
}
