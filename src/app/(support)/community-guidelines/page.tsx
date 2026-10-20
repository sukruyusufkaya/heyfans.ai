import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return legalMetadata("community-guidelines", t("Topluluk Kuralları — Saygılı, Güvenli, Gerçek Bağlantılar"), t("HEYFANS topluluğunda herkesin kendini güvende ve saygı görmüş hissetmesi için ortak kurallar ve moderasyon ilkeleri."), "/community-guidelines");
}

export default async function CommunityGuidelinesPage() {
  const t = await getT();
  return (
    <LegalDocument
      slug="community-guidelines"
      eyebrow={t("Topluluk Kuralları / HEYFANS")}
      title={t("Saygılı, güvenli,")}
      highlight={t("gerçek bağlantılar.")}
      description={t("HEYFANS topluluğunda herkesin kendini güvende ve saygı görmüş hissetmesi için ortak kurallar ve moderasyon ilkeleri.")}
      icon={<HeartHandshake />}
      actions={
        <>
          <p className="text-xs font-bold text-ink-soft">{t("Topluluğumuzu birlikte koruyalım. Bir ihlal gördüğünde bildir.")}</p>
          <Button asChild shape="pill" size="md">
            <Link href="/trust-and-safety#bildir">
              {t("Bildirim Oluştur")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </>
      }
    />
  );
}
