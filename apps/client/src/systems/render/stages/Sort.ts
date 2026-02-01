import { useSystem, useWorld } from "@repo/engine";
import { Shape } from "@repo/engine/components";

export function SortStage(): void {
  const world = useWorld();
  const { data } = useSystem("render");
  const commands = data.commands;

  commands.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "setView" ? -1 : 1;
    }

    if (a.kind === "setView" && b.kind === "setView") return 0;

    if (a.kind === "shape" && b.kind === "shape") {
      const shapeA = world.get(a.entity, Shape);
      const shapeB = world.get(b.entity, Shape);

      const layerA = shapeA?.layer ?? 0;
      const layerB = shapeB?.layer ?? 0;
      if (layerA !== layerB) return layerA - layerB;

      const zOrderA = shapeA?.zOrder ?? 0;
      const zOrderB = shapeB?.zOrder ?? 0;
      return zOrderA - zOrderB;
    }

    return 0;
  });
}