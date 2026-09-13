export function validateAllocations(
  amount: number,
  allocations: { weight: number }[],
): string;
export function validateSchedule(
  schedule: { date: string; percent: number }[],
  today?: string,
): string;
export function validAddress(address: string): boolean;
