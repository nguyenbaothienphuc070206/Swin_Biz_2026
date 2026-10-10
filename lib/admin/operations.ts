export type Slot = "sáng" | "chiều" | "tối";

export interface Caregiver {
  id: string;
  name: string;
  commune: string;
  availableSlots: Slot[];
  rating: number;
  activeCases: number;
  maxCases: number;
  verified: boolean;
}

export interface FamilyNeed {
  id: string;
  name: string;
  commune: string;
  preferredSlot: Slot;
}

export interface AlertRecord {
  id: string;
  label: string;
  familyId: string;
  ownerId: string | null;
  calledAt: string | null;
  outcome: string | null;
}

export interface IncidentRecord {
  id: string;
  title: string;
  cause: string;
  lesson: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  subjectId: string;
  occurredAt: string;
}

export interface AdminState {
  caregivers: Caregiver[];
  families: FamilyNeed[];
  alerts: AlertRecord[];
  incidents: IncidentRecord[];
  audit: AuditRecord[];
}

type OperationResult = { ok: true; state: AdminState } | { ok: false; reason: string };

function timestamp(date?: Date): string {
  return (date ?? new Date()).toISOString();
}

function audit(state: AdminState, actorId: string, action: string, subjectId: string, when: string): AuditRecord[] {
  return [...state.audit, { id: `audit-${state.audit.length + 1}`, actorId, action, subjectId, occurredAt: when }];
}

export function eligibleCaregivers(state: AdminState, familyId: string): Caregiver[] {
  const family = state.families.find((item) => item.id === familyId);
  if (!family) return [];
  return state.caregivers
    .filter((person) => person.verified && person.activeCases < person.maxCases && person.commune === family.commune && person.availableSlots.includes(family.preferredSlot))
    .sort((a, b) => b.rating - a.rating || a.activeCases - b.activeCases);
}

export function assignCaregiver(state: AdminState, familyId: string, caregiverId: string, actorId: string, now?: Date): OperationResult {
  const family = state.families.find((item) => item.id === familyId);
  const caregiver = state.caregivers.find((item) => item.id === caregiverId);
  if (!family || !caregiver) return { ok: false, reason: "not_found" };
  if (!caregiver.verified) return { ok: false, reason: "not_verified" };
  if (caregiver.commune !== family.commune || !caregiver.availableSlots.includes(family.preferredSlot)) return { ok: false, reason: "schedule_mismatch" };
  if (caregiver.activeCases >= caregiver.maxCases) return { ok: false, reason: "no_capacity" };
  const when = timestamp(now);
  return {
    ok: true,
    state: {
      ...state,
      caregivers: state.caregivers.map((item) => item.id === caregiverId ? { ...item, activeCases: item.activeCases + 1 } : item),
      audit: audit(state, actorId, "caregiver.assigned", `${familyId}:${caregiverId}`, when),
    },
  };
}

export function assignAlertOwner(state: AdminState, alertId: string, ownerId: string, actorId: string, now?: Date): OperationResult {
  if (!ownerId.trim()) return { ok: false, reason: "owner_required" };
  if (!state.alerts.some((item) => item.id === alertId)) return { ok: false, reason: "not_found" };
  const when = timestamp(now);
  return {
    ok: true,
    state: {
      ...state,
      alerts: state.alerts.map((item) => item.id === alertId ? { ...item, ownerId } : item),
      audit: audit(state, actorId, "alert.owner_assigned", alertId, when),
    },
  };
}

export function markAlertCalled(state: AdminState, alertId: string, actorId: string, now?: Date): OperationResult {
  const alert = state.alerts.find((item) => item.id === alertId);
  if (!alert) return { ok: false, reason: "not_found" };
  if (!alert.ownerId) return { ok: false, reason: "owner_required" };
  const when = timestamp(now);
  return {
    ok: true,
    state: {
      ...state,
      alerts: state.alerts.map((item) => item.id === alertId ? { ...item, calledAt: when } : item),
      audit: audit(state, actorId, "alert.call_recorded", alertId, when),
    },
  };
}

export function recordAlertOutcome(state: AdminState, alertId: string, outcome: string, actorId: string, now?: Date): OperationResult {
  const alert = state.alerts.find((item) => item.id === alertId);
  const result = outcome.trim();
  if (!alert) return { ok: false, reason: "not_found" };
  if (!alert.ownerId) return { ok: false, reason: "owner_required" };
  if (!result || result.length > 240) return { ok: false, reason: "invalid_outcome" };
  const when = timestamp(now);
  return {
    ok: true,
    state: {
      ...state,
      alerts: state.alerts.map((item) => item.id === alertId ? { ...item, outcome: result } : item),
      audit: audit(state, actorId, "alert.outcome_recorded", alertId, when),
    },
  };
}

export function recordIncident(
  state: AdminState,
  input: { title: string; cause: string; lesson: string },
  actorId: string,
  now?: Date,
): OperationResult {
  const title = input.title.trim();
  const cause = input.cause.trim();
  const lesson = input.lesson.trim();
  if (!title || !cause || !lesson || title.length > 120 || cause.length > 500 || lesson.length > 500) {
    return { ok: false, reason: "invalid_incident" };
  }
  const when = timestamp(now);
  const id = `incident-${state.incidents.length + 1}`;
  return {
    ok: true,
    state: {
      ...state,
      incidents: [...state.incidents, { id, title, cause, lesson, createdAt: when, createdBy: actorId }],
      audit: audit(state, actorId, "incident.recorded", id, when),
    },
  };
}
