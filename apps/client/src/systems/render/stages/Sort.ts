import { useSystem, useWorld } from "@repo/engine";
import { Shape, Sprite } from "@repo/engine/components";

function getLayerAndZ(world: ReturnType<typeof useWorld>, entity: any): [number, number] {
  const shape = world.get(entity, Shape);
  if (shape) return [shape.layer, shape.zOrder];

  const sprite = world.get(entity, Sprite);
  if (sprite) return [sprite.layer, sprite.zOrder];

  return [0, 0];
}

export function SortStage(): void {
  const world = useWorld();
  const { data } = useSystem("render");
  const commands = data.commands;

  commands.sort((a, b) => {
    // setView always comes first
    if (a.kind === "setView") return -1;
    if (b.kind === "setView") return 1;

    const [layerA, zA] = getLayerAndZ(world, (a as any).entity);
    const [layerB, zB] = getLayerAndZ(world, (b as any).entity);

    if (layerA !== layerB) return layerA - layerB;
    return zA - zB;
  });
}