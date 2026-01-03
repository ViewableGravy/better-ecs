import { Vec3 } from "@repo/engine";
import { createSystem, useDelta, useEngine, useWorld } from "@repo/engine/core";
import z from "zod";
import { PlayerComponent } from "../../components/player";
import { PreviousPosition } from "../../components/previousPosition";

export const System = createSystem("movement")({
  system: Entrypoint,
  schema: {
    default: {},
    schema: z.object({})
  },
});

function Entrypoint() {
  /***** HOOKS *****/
  const engine = useEngine();
  const world = useWorld();
  const [updateDelta] = useDelta();

  /***** QUERIES *****/
  const [playerId] = world.query(PlayerComponent)
 
  const position = world.get(playerId, Vec3);
  const previousPosition = world.get(playerId, PreviousPosition);

  if (!position || !previousPosition) return;

  // Store previous position before updating
  previousPosition.x = position.x;
  previousPosition.y = position.y;
  previousPosition.z = position.z;

  for (const key of engine.systems.input.data.keysDown) {
    const speed = 50 * (updateDelta / 1000);
    if (key === "ArrowUp" || key === "w") {
      position.y -= speed;
    }
    if (key === "ArrowDown" || key === "s") {
      position.y += speed;
    }
    if (key === "ArrowLeft" || key === "a") {
      position.x -= speed;
    }
    if (key === "ArrowRight" || key === "d") {
      position.x += speed;
    }
  }
}
