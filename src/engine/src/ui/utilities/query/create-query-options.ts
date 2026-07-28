import { queryOptions, type QueryKey } from "@tanstack/react-query";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type CreateQueryOptionsInput<TData, TQueryKey extends QueryKey> = {
  queryKey: TQueryKey;
  queryFn: () => TData | Promise<TData>;
  refetchInterval?: number | false;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const createQueryOptions = <TData, TQueryKey extends QueryKey>({
  queryKey,
  queryFn,
  refetchInterval = false,
}: CreateQueryOptionsInput<TData, TQueryKey>) => {
  return queryOptions({
    queryKey,
    queryFn,
    refetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
