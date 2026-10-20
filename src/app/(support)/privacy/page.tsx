import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return legalMetadata("privacy", t("Gizlilik Politikası"), t("HEYFANS'ta kişisel verilerinin nasıl toplandığı, işlendiği ve haklarını nasıl kullanabileceğin. Verilerin üzerinde şeffaflık ve kontrol."), "/privacy");
}

export default async function PrivacyPage() {
  const t = await getT();
  const subject = t("Kişisel veri (KVKK) talebi");
  return (
    <LegalDocument
      slug="privacy"
      eyebrow={t("HEYFANS / Yasal Bilgilendirme")}
      title={t("Gizlilik")}
      highlight={t("Politikası")}
      description={t("Verilerin üzerinde şeffaflık ve kontrol için tasarlanan bilgilendirme merkezi.")}
      icon={<ShieldCheck />}
      actions={
        <>
          <Button asChild variant="secondary" shape="pill" size="md">
            <Link href="/cookies">
              <Lock /> {t("Gizlilik tercihlerini yönet")}
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" shape="pill" size="md">
              <Link href={`/contact?${new URLSearchParams({ category: "safety", subject })}`}>{t("Veri talebi oluştur")}</Link>
            </Button>
            <Button asChild shape="pill" size="md">
              <Link href="/app/settings">{t("Veri ve gizlilik ayarları")}</Link>
            </Button>
          </div>
        </>
      }
    />
  );
}
