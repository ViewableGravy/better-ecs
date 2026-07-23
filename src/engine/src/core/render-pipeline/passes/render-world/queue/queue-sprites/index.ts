import { Engine, fromContext, FromRender } from "@engine/context";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function queueSprites(): void {
  const context = fromContext(FromRender.Context);
  const engine = fromContext(Engine);
  context.retainedSprites.syncAndQueue(
    context.world,
    context.queue,
    performance.now(),
    engine.meta.updateTick,
  );
}

