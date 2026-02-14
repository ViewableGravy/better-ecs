/**
 * Legacy placeholder kept temporarily while migrating to render passes.
 * Context visuals are now applied in `systems/render/passes/ApplyContextVisualsPass`.
 */
export const HouseVisualsSystem = () => {
  throw new Error("HouseVisualsSystem is deprecated. Use ApplyContextVisualsPass instead.");
};
