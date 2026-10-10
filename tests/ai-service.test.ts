import { afterEach, describe, expect, it, vi } from "vitest";
import type { JsonGenerator } from "../lib/ai/service";
import { createAlertExplanation, createVisitSummary, createWeeklyTrend } from "../lib/ai/service";

const elderId = "00000000-0000-4000-8000-000000000001";
const visitId = "00000000-0000-4000-8000-000000000002";
const validVisit = {
  visitId,
  visitedAt: "2026-10-05T09:00:00+07:00",
  bloodPressure: null,
  medications: [{ label: "Thuốc A", status: "recorded_taken" as const }],
  caregiverNote: "Bà vui vẻ.",
};
const policy = { bloodPressure: { enabled: true as const, systolicHigh: 180, diastolicHigh: 120, severity: "urgent_review" as const }, consecutiveMisses: 2 };
const quietAudit = () => vi.spyOn(console, "info").mockImplementation(() => undefined);

afterEach(() => vi.restoreAllMocks());

describe("AI service safety boundaries", () => {
  it("rejects unsafe generated visit summary", async () => {
    quietAudit();
    const generator: JsonGenerator = { generate: vi.fn().mockResolvedValue({ summary: "Bạn nên tăng liều thuốc ngay. Bà đã dùng thuốc. Buổi thăm đã hoàn tất." }) };
    await expect(createVisitSummary(generator, validVisit)).rejects.toThrow("UNSAFE_AI_OUTPUT");
  });

  it("keeps alert severity and next step from deterministic policy", async () => {
    quietAudit();
    const generator: JsonGenerator = { generate: vi.fn().mockResolvedValue({ explanation: "Số đo đã chạm ngưỡng theo dõi đã cấu hình." }) };
    const result = await createAlertExplanation(generator, {
      elderId,
      measuredAt: "2026-10-05T09:05:00+07:00",
      bloodPressure: { systolic: 181, diastolic: 80, measuredAt: "2026-10-05T09:05:00+07:00" },
      consecutiveMissedMedicationCount: 0,
    }, policy);
    expect(result.severity).toBe("urgent_review");
    expect(result.nextStepCode).toBe("contact_coordinator");
    expect(result.nextStep).toContain("điều phối viên");
  });

  it("does not call Claude when no deterministic alert rule triggers", async () => {
    quietAudit();
    const generator: JsonGenerator = { generate: vi.fn() };
    const result = await createAlertExplanation(generator, {
      elderId,
      measuredAt: "2026-10-05T09:05:00+07:00",
      bloodPressure: null,
      consecutiveMissedMedicationCount: 0,
    }, policy);
    expect(result.triggered).toBe(false);
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("uses deterministic trend fields and chart, with AI writing only the paragraph", async () => {
    quietAudit();
    const generator: JsonGenerator = { generate: vi.fn().mockResolvedValue({ paragraph: "Trong tuần có hai số đo được ghi nhận. Chỉ số được trình bày theo ngày. Nhật ký thuốc chưa đủ thông tin để kết luận thêm." }) };
    const result = await createWeeklyTrend(generator, {
      elderId,
      weekStarting: "2026-10-05",
      measurements: [
        { date: "2026-10-05", systolic: 120, diastolic: 80 },
        { date: "2026-10-06", systolic: 135, diastolic: 85 },
      ],
      medicationLogs: [],
    });
    expect(result.bloodPressureDirection).toBe("up");
    expect(result.chart).toHaveLength(2);
    expect(result.medicationAdherence).toBeNull();
  });
});
