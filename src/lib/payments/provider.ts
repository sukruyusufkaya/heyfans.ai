import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { allowsMockProviders, env } from "@/config/env";
import { FeatureUnavailableError } from "@/lib/errors";

export interface CheckoutRequest {
  transactionId: string;
  amountMinor: number;
  currency: string;
  description: string;
  customer: { id: string; email: string; name: string };
  successUrl: string;
  cancelUrl: string;
  recurring?: { interval: "month" | "year" } | null;
}

export interface CheckoutSession {
  sessionId: string;
  redirectUrl: string;
}

export interface PaymentEvent {
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "refund.succeeded" | "chargeback.created" | "other";
  sessionId?: string | null;
  paymentId?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  failureReason?: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isTest: boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** İmza doğrulanmazsa hata fırlatır. Ham gövde değiştirilmeden verilmelidir. */
  parseWebhook(headers: Headers, rawBody: string): Promise<PaymentEvent>;
  refund(input: { paymentId: string; amountMinor: number; currency: string; reason: string }): Promise<{ refundId: string; status: "succeeded" | "pending" }>;
}

/* ─── Mock (yalnız geliştirme/test) ──────────────────────────────────────────
 * Gerçek sağlayıcının akışını taklit eder: uygulama içi "TEST ÖDEMESİ" sayfasına yönlendirir,
 * onay/ret HMAC imzalı webhook olarak işlenir. Üretimde (APP_MODE=production) yüklenemez.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly isTest = true;
  constructor(private readonly secret: string) {}

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const sessionId = `mock_cs_${randomUUID().replace(/-/g, "")}`;
    return { sessionId, redirectUrl: `/checkout/test/${sessionId}` };
  }

  sign(body: string, timestamp = Math.floor(Date.now() / 1000)) {
    const sig = createHmac("sha256", this.secret).update(`${timestamp}.${body}`).digest("hex");
    return `t=${timestamp},v1=${sig}`;
  }

  async parseWebhook(headers: Headers, rawBody: string): Promise<PaymentEvent> {
    verifyTimestampedSignature(headers.get("x-mock-signature"), rawBody, this.secret, 300);
    const body = JSON.parse(rawBody) as { id: string; type: PaymentEvent["type"]; sessionId: string; paymentId?: string; amountMinor?: number; currency?: string; failureReason?: string };
    return { eventId: body.id, type: body.type, sessionId: body.sessionId, paymentId: body.paymentId ?? null, amountMinor: body.amountMinor ?? null, currency: body.currency ?? null, failureReason: body.failureReason ?? null, raw: body };
  }

  async refund(input: { paymentId: string }) {
    return { refundId: `mock_re_${input.paymentId.slice(-10)}_${Date.now()}`, status: "succeeded" as const };
  }
}

/* ─── Stripe (Checkout Session + imzalı webhook; yalnız uygun ülke/tüzel kişilikte) ─── */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  readonly isTest: boolean;
  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.isTest = secretKey.startsWith("sk_test_");
  }

  private async api(path: string, params: Record<string, string>) {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      // i18n-ignore (HTTP başlığı)
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": params["metadata[transactionId]"] ?? randomUUID() },
      body: new URLSearchParams(params),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Stripe hatası: ${(json.error as { message?: string })?.message ?? res.status}`); // i18n-ignore (geliştirici/günlük hatası)
    return json;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const params: Record<string, string> = {
      mode: req.recurring ? "subscription" : "payment",
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      customer_email: req.customer.email,
      client_reference_id: req.transactionId,
      "metadata[transactionId]": req.transactionId,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": req.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(req.amountMinor),
      "line_items[0][price_data][product_data][name]": req.description,
    };
    if (req.recurring) params["line_items[0][price_data][recurring][interval]"] = req.recurring.interval;
    const session = await this.api("checkout/sessions", params);
    return { sessionId: String(session.id), redirectUrl: String(session.url) };
  }

  async parseWebhook(headers: Headers, rawBody: string): Promise<PaymentEvent> {
    const header = headers.get("stripe-signature");
    verifyTimestampedSignature(header, rawBody, this.webhookSecret, 300);
    const evt = JSON.parse(rawBody) as { id: string; type: string; data: { object: Record<string, unknown> } };
    const obj = evt.data.object;
    const map: Record<string, PaymentEvent["type"]> = {
      "checkout.session.completed": "payment.succeeded",
      "checkout.session.async_payment_failed": "payment.failed",
      "checkout.session.expired": "payment.failed",
      "charge.refunded": "refund.succeeded",
      "charge.dispute.created": "chargeback.created",
    };
    return {
      eventId: evt.id,
      type: map[evt.type] ?? "other",
      sessionId: (obj.object === "checkout.session" ? (obj.id as string) : null) ?? null,
      paymentId: (obj.payment_intent as string) ?? (obj.id as string) ?? null,
      amountMinor: (obj.amount_total as number) ?? (obj.amount as number) ?? null,
      currency: ((obj.currency as string) ?? "").toUpperCase() || null,
      raw: evt,
    };
  }

  async refund(input: { paymentId: string; amountMinor: number; reason: string }) {
    const r = await this.api("refunds", { payment_intent: input.paymentId, amount: String(input.amountMinor), "metadata[reason]": input.reason.slice(0, 200) });
    return { refundId: String(r.id), status: r.status === "succeeded" ? ("succeeded" as const) : ("pending" as const) };
  }
}

/* ─── iyzico (TR) — adaptör iskeleti ──────────────────────────────────────────
 * Checkout Form başlatma + sonuç sorgulama + iade uçları sözleşme/anahtar alındıktan sonra
 * sandbox'ta doğrulanarak tamamlanacak. O zamana kadar açıkça "yapılandırılmadı" hatası verir.
 */
export class IyzicoPaymentProvider implements PaymentProvider {
  readonly name = "iyzico";
  readonly isTest = false;
  private notReady(): never {
    throw new FeatureUnavailableError("iyzico entegrasyonu henüz etkin değil: sandbox doğrulaması ve pazaryeri (alt üye işyeri) sözleşmesi bekleniyor.", [
      "PAYMENT_API_KEY",
      "PAYMENT_SECRET_KEY",
      "iyzico pazaryeri sözleşmesi", // i18n-ignore (eksik-bileşen listesi, yönetici/geliştirici bilgisi)
    ]);
  }
  async createCheckout(): Promise<CheckoutSession> {
    return this.notReady();
  }
  async parseWebhook(): Promise<PaymentEvent> {
    return this.notReady();
  }
  async refund(): Promise<{ refundId: string; status: "succeeded" | "pending" }> {
    return this.notReady();
  }
}

export function verifyTimestampedSignature(header: string | null, rawBody: string, secret: string, toleranceSec: number) {
  if (!header) throw new Error("İmza başlığı yok"); // i18n-ignore (geliştirici/günlük hatası)
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!t || !v1) throw new Error("İmza biçimi geçersiz"); // i18n-ignore (geliştirici/günlük hatası)
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) throw new Error("İmza zaman aşımı"); // i18n-ignore (geliştirici/günlük hatası)
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("İmza doğrulanamadı"); // i18n-ignore (geliştirici/günlük hatası)
}

export function getPaymentProvider(): PaymentProvider {
  const e = env();
  switch (e.PAYMENT_PROVIDER) {
    case "mock":
      if (!allowsMockProviders()) throw new FeatureUnavailableError("Test ödeme sağlayıcısı üretimde kullanılamaz.");
      if (!e.PAYMENT_WEBHOOK_SECRET) throw new FeatureUnavailableError("PAYMENT_WEBHOOK_SECRET tanımlı değil.", ["PAYMENT_WEBHOOK_SECRET"]);
      return new MockPaymentProvider(e.PAYMENT_WEBHOOK_SECRET);
    case "stripe":
      if (!e.PAYMENT_SECRET_KEY || !e.PAYMENT_WEBHOOK_SECRET) throw new FeatureUnavailableError("Stripe anahtarları eksik.", ["PAYMENT_SECRET_KEY", "PAYMENT_WEBHOOK_SECRET"]);
      return new StripePaymentProvider(e.PAYMENT_SECRET_KEY, e.PAYMENT_WEBHOOK_SECRET);
    case "iyzico":
      return new IyzicoPaymentProvider();
    default:
      throw new FeatureUnavailableError("Ödeme sağlayıcısı yapılandırılmadı. Ödemeler şu anda alınamıyor.", ["PAYMENT_PROVIDER"]);
  }
}

export function paymentsConfigured() {
  try {
    const p = getPaymentProvider();
    return { configured: p.name !== "iyzico", provider: p.name, isTest: p.isTest };
  } catch {
    return { configured: false, provider: env().PAYMENT_PROVIDER, isTest: false };
  }
}
