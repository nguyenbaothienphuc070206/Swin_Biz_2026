import { alertPolicySchema, type AlertInput, type AlertPolicy, type AlertRuleDecision } from "./contracts";

export const defaultAlertPolicy: AlertPolicy = {
  bloodPressure: { enabled: false },
  consecutiveMisses: 2,
};

export function loadAlertPolicy(env: NodeJS.ProcessEnv = process.env): AlertPolicy {
  if (env.ALERT_BP_ENABLED !== "true") return defaultAlertPolicy;
  const systolicHigh = Number(env.ALERT_BP_SYSTOLIC_HIGH);
  const diastolicHigh = Number(env.ALERT_BP_DIASTOLIC_HIGH);
  const severity = env.ALERT_BP_SEVERITY;
  return alertPolicySchema.parse({
    bloodPressure: { enabled: true, systolicHigh, diastolicHigh, severity },
    consecutiveMisses: 2,
  });
}

export function decideAlert(input: AlertInput, policy: AlertPolicy): AlertRuleDecision {
  const ruleCodes: AlertRuleDecision["ruleCodes"] = [];
  if (policy.bloodPressure.enabled && input.bloodPressure?.systolic != null && input.bloodPressure.systolic >= policy.bloodPressure.systolicHigh) ruleCodes.push("BP_SYS_HIGH");
  if (policy.bloodPressure.enabled && input.bloodPressure?.diastolic != null && input.bloodPressure.diastolic >= policy.bloodPressure.diastolicHigh) ruleCodes.push("BP_DIA_HIGH");
  if (input.consecutiveMissedMedicationCount >= policy.consecutiveMisses) ruleCodes.push("MED_MISSED_TWICE");

  // Only BP rules invoke the preapproved emergency protocol. A medication rule
  // alone routes to a coordinator and never recommends changing a dose.
  const bpTriggered = ruleCodes.some((code) => code === "BP_SYS_HIGH" || code === "BP_DIA_HIGH");
  const bpSeverity = bpTriggered && policy.bloodPressure.enabled ? policy.bloodPressure.severity : null;
  return {
    triggered: ruleCodes.length > 0,
    ruleCodes,
    severity: bpSeverity ?? (ruleCodes.length ? "urgent_review" : "none"),
    nextStepCode: bpSeverity === "emergency_protocol" ? "follow_emergency_protocol" : ruleCodes.length ? "contact_coordinator" : "none",
  };
}
