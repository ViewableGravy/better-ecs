import { useState } from "react";
import { shallow } from "@ui/utilities/shallow";
import { useInterval } from "@ui/utilities/hooks/use-interval";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function useIntervalState<T>(intervalMs: number, callback: () => T): T {
  /***** STATE *****/
  const [value, setValue] = useState<T>(() => callback());

  /***** HOOKS *****/
  useInterval(intervalMs, () => {
    const nextValue = callback();

    setValue((previousValue) => {
      if (shallow(previousValue, nextValue)) {
        return previousValue;
      }

      return nextValue;
    });
  });

  /***** HOOK RESULTS *****/
  return value;
}
