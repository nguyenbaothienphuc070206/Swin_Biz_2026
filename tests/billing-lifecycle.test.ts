import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  applyVerifiedMomoPaymentEvent,
  requestCancellationAtPeriodEnd,
  verifyMomoPaymentNotification,
  type BillingStore,
  type BillingTransaction,
  type MomoPaymentEvent,
} from "../lib/billing/lifecycle";

type Contribution = { id: string; orderId: string; subscriptionId: string; state: "pending" | "paid" | "failed"; transactionId?: string };
type Subscription = { id: string; status: "active" | "past_due" | "expired"; periodEnd: Date; renewalEnabled: boolean; cancelAtPeriodEnd: boolean };

function makeStore(): BillingStore & { contribution: Contribution; subscription: Subscription; eventKeys: Set<string> } {
  const contribution: Contribution = { id: "contribution-1", orderId: "order-1", subscriptionId: "subscription-1", state: "pending" };
  const subscription: Subscription = { id: "subscription-1", status: "active", periodEnd: new Date("2026-11-10T00:00:00.000Z"), renewalEnabled: true, cancelAtPeriodEnd: false };
  const eventKeys = new Set<string>();
  const tx: BillingTransaction = {
    claimWebhookEvent: async (key) => {
      if (eventKeys.has(key)) return false;
      eventKeys.add(key);
      return true;
    },
    findContributionByOrderId: async (orderId) => orderId === contribution.orderId ? { ...contribution } : null,
    markContributionPaid: async (_id, transactionId) => {
      if (contribution.state === "paid") return false;
      contribution.state = "paid";
      contribution.transactionId = transactionId;
      return true;
    },
    markContributionFailed: async () => {
      if (contribution.state !== "pending") return false;
      contribution.state = "failed";
      return true;
    },
    setSubscriptionPastDue: async (id) => {
      if (id !== subscription.id) return;
      subscription.status = "past_due";
    },
    getSubscription: async (id) => id === subscription.id ? { ...subscription } : null,
    stopRenewalAtPeriodEnd: async (id) => {
      if (id !== subscription.id) return null;
      subscription.renewalEnabled = false;
      subscription.cancelAtPeriodEnd = true;
      return { ...subscription };
    },
  };
  return { contribution, subscription, eventKeys, transaction: async (work) => work(tx) };
}

const paidEvent: MomoPaymentEvent = {
  eventKey: "momo:transaction-123",
  orderId: "order-1",
  transactionId: "transaction-123",
  resultCode: 0,
};

describe("MoMo subscription billing lifecycle", () => {
  it("authenticates the exact documented IPN signature and rejects tampering", () => {
    const fields = {
      amount: 250000,
      callbackToken: "callback-token",
      extraData: "",
      message: "Success",
      orderId: "order-1",
      orderInfo: "Nha Gan subscription",
      orderType: "momo_wallet",
      partnerClientId: "user-1",
      partnerCode: "partner-1",
      payType: "app",
      requestId: "request-1",
      responseTime: 1_797_000_000_000,
      resultCode: 0,
      transId: 987654321,
    };
    const canonical = [
      "accessKey=access",
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
    const signature = createHmac("sha256", "test-secret").update(canonical).digest("hex");

    expect(verifyMomoPaymentNotification(fields, signature, "test-secret", "access")).toBe(true);
    expect(verifyMomoPaymentNotification({ ...fields, amount: 1 }, signature, "test-secret", "access")).toBe(false);
  });

  it("handles a duplicate successful webhook exactly once", async () => {
    const store = makeStore();

    const first = await applyVerifiedMomoPaymentEvent(store, paidEvent);
    const duplicate = await applyVerifiedMomoPaymentEvent(store, paidEvent);

    expect(first).toEqual({ outcome: "applied", paymentState: "paid" });
    expect(duplicate).toEqual({ outcome: "duplicate" });
    expect(store.contribution.state).toBe("paid");
    expect(store.contribution.transactionId).toBe("transaction-123");
  });

  it("marks an unsuccessful charge past due without extending service", async () => {
    const store = makeStore();
    const originalPeriodEnd = store.subscription.periodEnd;

    const result = await applyVerifiedMomoPaymentEvent(store, { ...paidEvent, eventKey: "momo:failed-456", resultCode: 1006 });

    expect(result).toEqual({ outcome: "applied", paymentState: "failed" });
    expect(store.contribution.state).toBe("failed");
    expect(store.subscription.status).toBe("past_due");
    expect(store.subscription.periodEnd).toEqual(originalPeriodEnd);
  });

  it("stops future renewal on cancellation but preserves paid access until period end", async () => {
    const store = makeStore();
    const periodEnd = store.subscription.periodEnd;

    const cancelled = await requestCancellationAtPeriodEnd(store, "subscription-1");

    expect(cancelled).toMatchObject({ renewalEnabled: false, cancelAtPeriodEnd: true, status: "active" });
    expect(cancelled?.periodEnd).toEqual(periodEnd);
    expect(store.subscription.periodEnd).toEqual(periodEnd);
  });
});
