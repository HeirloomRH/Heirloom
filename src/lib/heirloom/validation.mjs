// Validators return a stable error CODE, not a sentence, so the message can be
// rendered in the reader's language. "" means valid.
export function validateAllocations(amount, allocations) {
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000000)
    return "amount_range";
  if (
    !allocations.length ||
    allocations.some(
      (a) => !Number.isFinite(a.weight) || a.weight <= 0 || a.weight > 100,
    )
  )
    return "allocation_positive";
  if (Math.abs(allocations.reduce((s, a) => s + a.weight, 0) - 100) > 0.001)
    return "allocation_total";
  return "";
}
export function validateSchedule(
  schedule,
  today = new Date().toISOString().slice(0, 10),
) {
  if (!schedule.length) return "schedule_empty";
  if (
    schedule.some(
      (s) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
        !Number.isFinite(Date.parse(s.date)) ||
        new Date(s.date).toISOString().slice(0, 10) !== s.date ||
        s.date <= today,
    )
  )
    return "schedule_future";
  if (schedule.some((s, i) => i > 0 && s.date <= schedule[i - 1].date))
    return "schedule_order";
  if (
    schedule.some(
      (s) => !Number.isFinite(s.percent) || s.percent <= 0 || s.percent > 100,
    )
  )
    return "release_range";
  if (Math.abs(schedule.reduce((n, s) => n + s.percent, 0) - 100) > 0.001)
    return "release_total";
  return "";
}
export function validAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address) && !/^0x0{40}$/i.test(address);
}
