import { useSystem, useWorld } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";

export function CollectShapesStage(): void {
  const world = useWorld();
  const { data } = useSystem("render");
  const commands = data.commands;

  for (const id of world.query(Shape, Transform2D)) {
    commands.push({
      kind: "shape",
      entity: id,
    });
  }
}