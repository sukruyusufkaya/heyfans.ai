import "server-only";
import { randomUUID } from "node:crypto";
import { allowsMockProviders } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { getPaymentProvider, MockPaymentProvider } from "@/lib/payments/provider";
import { oid } from "@/lib/validation/common";
import { PaymentTransaction, type IPaymentTransaction } from "@/models/monetization";
import { processPaymentWebhook } from "./checkout";

/** TEST ödeme sayfası verisi — yalnız işlemin sahibi görebilir. */
export async function getMockSession(userId: string, sessionId: string) {
  if (!allowsMockProviders()) throw new NotFoundError();
  await connectDb();
  const tx = await PaymentTransaction.findOne({ provider: "mock", providerSessionId: sessionId, userId: oid(userId) }).lean<IPaymentTransaction>();
  if (!tx) throw new NotFoundError("Test ödeme oturumu bulunamadı.");
  return tx;
}

/**
 * TEST ödemesini sonuçlandırır: gerçek sağlayıcı gibi HMAC imzalı webhook gövdesi üretir ve
 * aynı webhook işleyicisinden geçirir (imza doğrulaması dahil). Üretimde çalışmaz.
 */
export async function completeMockPayment(userId: string, sessionId: string, outcome: "succeed" | "fail") {
  const provider = getPaymentProvider();
  if (!(provider instanceof MockPaymentProvider)) throw new AppError("Test ödemesi yalnız mock sağlayıcıda kullanılabilir.", "not_mock", 400);
  const tx = await getMockSession(userId, sessionId);
  if (tx.status !== "pending") return { status: tx.status, transactionId: tx._id.toString() };
  const body = JSON.stringify({
    id: `mock_evt_${randomUUID()}`,
    type: outcome === "succeed" ? "payment.succeeded" : "payment.failed",
    sessionId,
    paymentId: `mock_pi_${randomUUID().slice(0, 12)}`,
    amountMinor: tx.amount.amountMinor,
    currency: tx.amount.currency,
    failureReason: outcome === "fail" ? "Test: kart reddedildi" : undefined,
  });
  const headers = new Headers({ "x-mock-signature": provider.sign(body) });
  await processPaymentWebhook("mock", headers, body);
  const fresh = await PaymentTransaction.findById(tx._id).lean<IPaymentTransaction>();
  return { status: fresh?.status ?? "pending", transactionId: tx._id.toString() };
}

export async function getTransactionForUser(userId: string, transactionId: string) {
  await connectDb();
  const tx = await PaymentTransaction.findOne({ _id: oid(transactionId), userId: oid(userId) }).lean<IPaymentTransaction>();
  if (!tx) throw new NotFoundError("İşlem bulunamadı.");
  return tx;
}
