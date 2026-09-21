/** "" when valid; otherwise a stable code resolved against the locale dictionary. */
export type AllocationError =
  | ""
  | "amount_range"
  | "allocation_positive"
  | "allocation_total";

export type ScheduleError =
  | ""
  | "schedule_empty"
  | "schedule_future"
  | "schedule_order"
  | "release_range"
  | "release_total";

export function validateAllocations(
  amount: number,
  allocations: { weight: number }[],
): AllocationError;
export function validateSchedule(
  schedule: { date: string; percent: number }[],
  today?: string,
): ScheduleError;
export function validAddress(address: string): boolean;
