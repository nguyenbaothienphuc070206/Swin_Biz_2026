import type { WeeklyTrendInput } from "./contracts";

export function calculateWeeklyMetrics(input: WeeklyTrendInput) {
  const sorted = [...input.measurements].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted.at(-1);
  const delta = first && last ? last.systolic - first.systolic : null;
  const direction = delta == null || sorted.length < 2 ? "insufficient_data" : delta >= 10 ? "up" : delta <= -10 ? "down" : "stable";
  const eligible = input.medicationLogs.filter((x) => x.status !== "not_confirmed");
  const adherence = eligible.length ? eligible.filter((x) => x.status === "recorded_taken").length / eligible.length : null;
  return {
    measurementCount: sorted.length,
    firstSystolic: first?.systolic ?? null,
    lastSystolic: last?.systolic ?? null,
    systolicDelta: delta,
    bloodPressureDirection: direction as "up" | "down" | "stable" | "insufficient_data",
    medicationTakenCount: eligible.filter((x) => x.status === "recorded_taken").length,
    medicationEligibleCount: eligible.length,
    medicationAdherence: adherence,
    chart: sorted.map((x) => ({ date: x.date, systolic: x.systolic, diastolic: x.diastolic })),
  };
}
