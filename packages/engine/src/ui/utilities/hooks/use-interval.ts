import { useEffect, useRef } from "react";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function useInterval(intervalMs: number, callback: () => void): void {
  /***** HOOKS *****/
  const callbackRef = useRef(callback);

  // store callback in ref, so that the interval doesn't need to be 
  // re-created when the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // create interval that calls callbackRef.current, which always has the latest callback
  // interval is only re-created when intervalMs changes
  useEffect(() => {
    if (intervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      callbackRef.current();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs]);
}
