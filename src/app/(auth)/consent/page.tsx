import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { ConsentForm } from "@/features/auth/consent-form";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { User } from "@/models/identity";
import { resolvePostLoginDestination } from "@/services/auth/post-login";

export const metadata: Metadata = { title: "Şartları Onayla", robots: { index: false } };

/** Google/Apple ile kayıt olanlar için şart onayı. Onay zaten varsa kullanıcı akışına devam eder. */
export default async function ConsentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const { user } = await requireUser("/consent");
  await connectDb();
  const fresh = await User.findById(oid(user.id), { termsAcceptedAt: 1 }).lean();
  if (fresh?.termsAcceptedAt) redirect(await resolvePostLoginDestination(user, next));

  return (
    <AuthShell
      mode="merged"
      ratio="verify"
      inner
      visual={
        <AuthVisual
          art="portrait"
          eyebrow="Güvenli bir topluluk"
          lines={[{ text: "Şeffaf kurallar," }, { text: "güvenli bağlantılar.", accent: true }]}
          body="HEYFANS'ta her şey açık rıza ve şeffaflık üzerine kurulu. Kuralları bir kez onayla, keşfetmeye başla."
          footer={<VisualNote icon={<ShieldCheck />}>Verilerin satılmaz, sohbetlerin korunur.</VisualNote>}
        />
      }
    >
      <ConsentForm name={user.name} next={next} />
    </AuthShell>
  );
}
