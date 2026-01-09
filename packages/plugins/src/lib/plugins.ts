import { createSystem } from '@repo/engine';

/***** TYPE DEFINITIONS *****/
type Opts = {

}

export const System = (opts: Opts) => createSystem("engine:fps-counter")({
  system: EntryPoint,
  schema: {
    default: {} as never,
    schema: { "~standard": {} }
  }
});

function EntryPoint() {

}
