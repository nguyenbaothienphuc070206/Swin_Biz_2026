import { describe, expect, it } from "vitest";
import {
  assignCaregiver,
  assignAlertOwner,
  markAlertCalled,
  recordIncident,
  type AdminState,
} from "../lib/admin/operations";

const initial: AdminState = {
  caregivers: [
    { id: "care-1", name: "Cô Mai", commune: "Xã An Bình", availableSlots: ["sáng"], rating: 4.9, activeCases: 2, maxCases: 5, verified: true },
    { id: "care-2", name: "Chú Lâm", commune: "Xã An Bình", availableSlots: ["sáng"], rating: 4.7, activeCases: 5, maxCases: 5, verified: true },
    { id: "care-3", name: "Cô Hoa", commune: "Xã Bình An", availableSlots: ["sáng"], rating: 5, activeCases: 0, maxCases: 5, verified: false },
  ],
  families: [{ id: "family-1", name: "Bác Nguyễn Thị Lan", commune: "Xã An Bình", preferredSlot: "sáng" }],
  alerts: [{ id: "alert-1", label: "Chưa xác nhận lượt thăm", familyId: "family-1", ownerId: null, calledAt: null, outcome: null }],
  incidents: [],
  audit: [],
};

describe("admin coordination operations", () => {
  it("suggests only verified caregivers with capacity, matching commune and availability", () => {
    const result = assignCaregiver(initial, "family-1", "care-1", "admin-1", new Date("2026-10-10T10:00:00Z"));
    expect(result.ok).toBe(true);
    const full = assignCaregiver(initial, "family-1", "care-2", "admin-1");
    const unverified = assignCaregiver(initial, "family-1", "care-3", "admin-1");
    expect(full).toMatchObject({ ok: false, reason: "no_capacity" });
    expect(unverified).toMatchObject({ ok: false, reason: "not_verified" });
  });

  it("requires an accountable owner before marking an alert as called", () => {
    const unassigned = markAlertCalled(initial, "alert-1", "admin-1");
    expect(unassigned).toMatchObject({ ok: false, reason: "owner_required" });
    const assigned = assignAlertOwner(initial, "alert-1", "admin-2", "admin-1");
    expect(assigned.ok).toBe(true);
    if (!assigned.ok) return;
    const called = markAlertCalled(assigned.state, "alert-1", "admin-2", new Date("2026-10-10T10:00:00Z"));
    expect(called.ok).toBe(true);
  });

  it("writes actor, action and time to the audit trail for sensitive mutations", () => {
    const result = recordIncident(initial, { title: "Gia đình đổi lịch", cause: "Người nhà báo bận", lesson: "Xác nhận lịch trước 1 ngày" }, "admin-1", new Date("2026-10-10T10:00:00Z"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.audit.at(-1)).toMatchObject({ actorId: "admin-1", action: "incident.recorded", occurredAt: "2026-10-10T10:00:00.000Z" });
    expect(result.state.incidents).toHaveLength(1);
  });
});
