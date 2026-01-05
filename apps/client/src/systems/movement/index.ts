import { createSystem, useDelta, useSystem, useWorld } from "@repo/engine";
import { Transform } from "@repo/engine/components";
import z from "zod";
import { PlayerComponent } from "../../components/player";

export const System = createSystem("movement")({
  system: Entrypoint,
  schema: {
    default: {},
    schema: z.object({})
  },
});

function Entrypoint() {
  /***** HOOKS *****/
  const world = useWorld();
  const { data } = useSystem("input");
  const [updateDelta] = useDelta();

  /***** QUERIES *****/
  const [playerId] = world.query(PlayerComponent)
 
  const transform = world.get(playerId, Transform);

  if (!transform) return;

  for (const key of data.keysActive) {
    const speed = 50 * (updateDelta / 1000);
    if (key === "ArrowUp" || key === "w" || key === "W") {
      transform.curr.y -= speed;
    }
    if (key === "ArrowDown" || key === "s" || key === "S") {
      transform.curr.y += speed;
    }
    if (key === "ArrowLeft" || key === "a" || key === "A") {
      transform.curr.x -= speed;
    }
    if (key === "ArrowRight" || key === "d" || key === "D") {
      transform.curr.x += speed;
    }
  }
}
