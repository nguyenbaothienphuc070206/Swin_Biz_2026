import { createHmac, timingSafeEqual } from "node:crypto";

export type SubscriptionState = "active" | "past_due" | "expired";

export interface ContributionRecord {
  id: string;
  orderId: string;
  subscriptionId: string;
  state: "pending" | "paid" | "failed";
}

export interface SubscriptionRecord {
  id: string;
  status: SubscriptionState;
  periodEnd: Date;
  renewalEnabled: boolean;
  cancelAtPeriodEnd: boolean;
}

export interface BillingTransaction {
  // Must be a unique insert in the same database transaction as the state change.
  claimWebhookEvent(eventKey: string): Promise<boolean>;
  findContributionByOrderId(orderId: string): Promise<ContributionRecord | null>;
  markContributionPaid(id: string, transactionId: string): Promise<boolean>;
  markContributionFailed(id: string, resultCode: number): Promise<boolean>;
  setSubscriptionPastDue(id: string): Promise<void>;
  getSubscription(id: string): Promise<SubscriptionRecord | null>;
  stopRenewalAtPeriodEnd(id: string): Promise<SubscriptionRecord | null>;
}

export interface BillingStore {
  transaction<T>(work: (tx: BillingTransaction) => Promise<T>): Promise<T>;
}

export interface MomoPaymentEvent {
  eventKey: string;
  orderId: string;
  transactionId: string;
  resultCode: number;
}

export type PaymentApplyResult =
  | { outcome: "duplicate" }
  | { outcome: "ignored" }
  | { outcome: "applied"; paymentState: "paid" | "failed" };

export async function applyVerifiedMomoPaymentEvent(
  store: BillingStore,
  event: MomoPaymentEvent,
): Promise<PaymentApplyResult> {
  return store.transaction(async (tx) => {
    if (!(await tx.claimWebhookEvent(event.eventKey))) return { outcome: "duplicate" };

    const contribution = await tx.findContributionByOrderId(event.orderId);
    if (!contribution || contribution.state !== "pending") return { outcome: "ignored" };

    if (event.resultCode === 0) {
      const changed = await tx.markContributionPaid(contribution.id, event.transactionId);
      return changed ? { outcome: "applied", paymentState: "paid" } : { outcome: "ignored" };
    }

    const changed = await tx.markContributionFailed(contribution.id, event.resultCode);
    if (!changed) return { outcome: "ignored" };
    await tx.setSubscriptionPastDue(contribution.subscriptionId);
    return { outcome: "applied", paymentState: "failed" };
  });
}

export async function requestCancellationAtPeriodEnd(
  store: BillingStore,
  subscriptionId: string,
): Promise<SubscriptionRecord | null> {
  return store.transaction(async (tx) => {
    const subscription = await tx.getSubscription(subscriptionId);
    if (!subscription || subscription.status === "expired") return null;
    return tx.stopRenewalAtPeriodEnd(subscriptionId);
  });
}

export type MomoNotificationFields = {
  amount: string | number;
  callbackToken: string;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerClientId: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: string | number;
  resultCode: string | number;
  transId: string | number;
};

export type MomoSubscriptionActionFields = {
  orderId: string;
  partnerClientId: string;
  partnerCode: string;
  requestId: string;
  requestType: "pause" | "cancel" | "lock" | "expire";
  tokenType: "subscription";
};

function verifyHmacHex(canonical: string, secretKey: string, signature: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secretKey).update(canonical, "utf8").digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(expected, actual);
}

export function verifyMomoPaymentNotification(
  fields: MomoNotificationFields,
  signature: string,
  secretKey: string,
  accessKey: string,
): boolean {
  const canonical = [
    `accessKey=${accessKey}`,
    `amount=${fields.amount}`,
    `callbackToken=${fields.callbackToken}`,
    `extraData=${fields.extraData}`,
    `message=${fields.message}`,
    `orderId=${fields.orderId}`,
    `orderInfo=${fields.orderInfo}`,
    `orderType=${fields.orderType}`,
    `partnerClientId=${fields.partnerClientId}`,
    `partnerCode=${fields.partnerCode}`,
    `payType=${fields.payType}`,
    `requestId=${fields.requestId}`,
    `responseTime=${fields.responseTime}`,
    `resultCode=${fields.resultCode}`,
    `transId=${fields.transId}`,
  ].join("&");
  return verifyHmacHex(canonical, secretKey, signature);
}

export function verifyMomoSubscriptionAction(
  fields: MomoSubscriptionActionFields,
  signature: string,
  secretKey: string,
  accessKey: string,
): boolean {
  const canonical = [
    `accessKey=${accessKey}`,
    `orderId=${fields.orderId}`,
    `partnerClientId=${fields.partnerClientId}`,
    `partnerCode=${fields.partnerCode}`,
    `requestId=${fields.requestId}`,
    `requestType=${fields.requestType}`,
    `tokenType=${fields.tokenType}`,
  ].join("&");
  return verifyHmacHex(canonical, secretKey, signature);
}
