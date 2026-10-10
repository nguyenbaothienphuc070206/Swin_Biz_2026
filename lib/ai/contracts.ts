import { z } from "zod";

const note = z.string().trim().max(2_000).default("");
const bloodPressureSchema = z.object({
  systolic: z.number().int().min(40).max(300),
  diastolic: z.number().int().min(20).max(200),
  measuredAt: z.string().datetime({ offset: true }),
}).strict();

export const visitSummaryInputSchema = z.object({
  visitId: z.string().uuid(),
  visitedAt: z.string().datetime({ offset: true }),
  bloodPressure: bloodPressureSchema.nullable(),
  medications: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    status: z.enum(["recorded_taken", "reported_missed", "not_confirmed"]),
  }).strict()).max(20),
  caregiverNote: note,
}).strict();
export type VisitSummaryInput = z.infer<typeof visitSummaryInputSchema>;
export const visitSummaryRequestSchema = z.object({ visitId: z.string().uuid() }).strict();

export const visitSummaryOutputSchema = z.object({
  summary: z.string().trim().min(1).max(700),
}).strict();
export type VisitSummaryOutput = z.infer<typeof visitSummaryOutputSchema>;

export const alertInputSchema = z.object({
  elderId: z.string().uuid(),
  measuredAt: z.string().datetime({ offset: true }),
  bloodPressure: bloodPressureSchema.nullable(),
  consecutiveMissedMedicationCount: z.number().int().min(0).max(100),
}).strict();
export type AlertInput = z.infer<typeof alertInputSchema>;
export const alertRequestSchema = z.object({ elderId: z.string().uuid() }).strict();

export const alertRuleSchema = z.object({
  triggered: z.boolean(),
  ruleCodes: z.array(z.enum(["BP_SYS_HIGH", "BP_DIA_HIGH", "MED_MISSED_TWICE"])).max(3),
  severity: z.enum(["none", "urgent_review", "emergency_protocol"]),
  nextStepCode: z.enum(["none", "contact_coordinator", "follow_emergency_protocol"]),
}).strict();
export type AlertRuleDecision = z.infer<typeof alertRuleSchema>;

export const alertPolicySchema = z.object({
  bloodPressure: z.discriminatedUnion("enabled", [
    z.object({ enabled: z.literal(false) }).strict(),
    z.object({
      enabled: z.literal(true),
      systolicHigh: z.number().int().min(80).max(300),
      diastolicHigh: z.number().int().min(40).max(200),
      severity: z.enum(["urgent_review", "emergency_protocol"]),
    }).strict(),
  ]),
  consecutiveMisses: z.number().int().min(1).max(10),
}).strict();
export type AlertPolicy = z.infer<typeof alertPolicySchema>;

export const alertExplanationSchema = z.object({
  explanation: z.string().trim().min(1).max(500),
  nextStep: z.string().trim().min(1).max(300),
}).strict();
export type AlertExplanation = z.infer<typeof alertExplanationSchema>;

export const weeklyTrendInputSchema = z.object({
  elderId: z.string().uuid(),
  weekStarting: z.string().date(),
  measurements: z.array(z.object({
    date: z.string().date(),
    systolic: z.number().int().min(40).max(300),
    diastolic: z.number().int().min(20).max(200),
  }).strict()).max(31),
  medicationLogs: z.array(z.object({
    date: z.string().date(),
    status: z.enum(["recorded_taken", "reported_missed", "not_confirmed"]),
  }).strict()).max(300),
}).strict();
export type WeeklyTrendInput = z.infer<typeof weeklyTrendInputSchema>;
export const weeklyTrendRequestSchema = z.object({ elderId: z.string().uuid(), weekStarting: z.string().date() }).strict();

export const weeklyTrendOutputSchema = z.object({
  paragraph: z.string().trim().min(1).max(600),
  bloodPressureDirection: z.enum(["up", "down", "stable", "insufficient_data"]),
  medicationAdherence: z.number().min(0).max(1).nullable(),
}).strict();
export type WeeklyTrendOutput = z.infer<typeof weeklyTrendOutputSchema>;

export const rateLimitedErrorSchema = z.object({
  error: z.literal("rate_limited"),
  retryAfterSeconds: z.number().int().positive(),
}).strict();
