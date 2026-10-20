import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return legalMetadata("terms", t("Kullanım Şartları"), t("HEYFANS'a katılmadan önce bilinmesi gereken temel kurallar ve karşılıklı sorumluluklar."), "/terms");
}

export default async function TermsPage() {
  const t = await getT();
  return (
    <LegalDocument
      slug="terms"
      eyebrow={t("HEYFANS / Yasal Bilgilendirme")}
      title={t("Kullanım")}
      highlight={t("Şartları")}
      description={t("Platforma katılmadan önce bilinmesi gereken temel kurallar ve karşılıklı sorumluluklar.")}
      icon={<ScrollText />}
      actions={
        <>
          <Button asChild variant="secondary" shape="pill" size="md">
            <Link href="/privacy">{t("Gizlilik Politikası")}</Link>
          </Button>
          <Button asChild shape="pill" size="md">
            <Link href="/help">{t("Yardım Merkezi")}</Link>
          </Button>
        </>
      }
    />
  );
}
