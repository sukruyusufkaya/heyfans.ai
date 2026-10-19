"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { refundTransaction } from "@/services/billing/checkout";
import { adminUpdatePayout, verifyPayoutAccount } from "@/services/payouts/payouts";
import { auditPayoutAccountReview } from "@/services/admin/finance";
import { actorOf, idSchema, reasonSchema } from "./guard";

function refresh() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
}

const refundSchema = z.object({
  transactionId: idSchema,
  amountTl: z.number({ error: "Geçerli bir tutar girin." }).positive("İade tutarı 0'dan büyük olmalı.").max(10_000_000, "Tutar çok büyük."),
  reason: reasonSchema,
});

export async function refundTransactionAction(input: unknown): Promise<ActionResult<{ refundId: string }>> {
  try {
    const { user } = await assertAdmin("finance.refund");
    const v = refundSchema.parse(input);
    const amountMinor = Math.round(v.amountTl * 100);
    const res = await refundTransaction(actorOf(user), v.transactionId, amountMinor, v.reason);
    refresh();
    return { ok: true, data: { refundId: res.refundId }, message: `İade işlendi (₺${v.amountTl.toLocaleString("tr-TR")}). Ters kayıtlar oluşturuldu.` };
  } catch (err) {
    return toActionError(err);
  }
}

const payoutSchema = z
  .object({
    payoutId: idSchema,
    to: z.enum(["approved", "rejected", "processing", "paid", "failed"]),
    reason: reasonSchema,
    providerRef: z.string().trim().max(120).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.to === "paid" && !(v.providerRef && v.providerRef.length >= 4)) ctx.addIssue({ code: "custom", path: ["providerRef"], message: "Ödendi olarak işaretlemek için banka/sağlayıcı referansı gerekli." });
  });

export async function updatePayoutAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin("payouts.manage");
    const v = payoutSchema.parse(input);
    await adminUpdatePayout(actorOf(user), v.payoutId, v.to, v.reason, v.providerRef || undefined);
    refresh();
    const labels = { approved: "onaylandı", rejected: "reddedildi", processing: "işleme alındı", paid: "ödendi olarak işaretlendi", failed: "başarısız olarak işaretlendi" } as const;
    return { ok: true, data: undefined, message: `Ödeme talebi ${labels[v.to]}.` };
  } catch (err) {
    return toActionError(err);
  }
}

const accountSchema = z.object({ accountId: idSchema, status: z.enum(["verified", "rejected"]), reason: reasonSchema });

export async function verifyPayoutAccountAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin("payouts.manage");
    const v = accountSchema.parse(input);
    await verifyPayoutAccount(actorOf(user), v.accountId, v.status);
    await auditPayoutAccountReview(actorOf(user), v.accountId, v.status, v.reason);
    refresh();
    return { ok: true, data: undefined, message: v.status === "verified" ? "Ödeme hesabı doğrulandı." : "Ödeme hesabı reddedildi." };
  } catch (err) {
    return toActionError(err);
  }
}
