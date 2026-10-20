import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("community-guidelines", "Topluluk Kuralları — Saygılı, Güvenli, Gerçek Bağlantılar", "HEYFANS topluluğunda herkesin kendini güvende ve saygı görmüş hissetmesi için ortak kurallar ve moderasyon ilkeleri.", "/community-guidelines");
}

export default function CommunityGuidelinesPage() {
  return (
    <LegalDocument
      slug="community-guidelines"
      eyebrow="Topluluk Kuralları / HEYFANS"
      title="Saygılı, güvenli,"
      highlight="gerçek bağlantılar."
      description="HEYFANS topluluğunda herkesin kendini güvende ve saygı görmüş hissetmesi için ortak kurallar ve moderasyon ilkeleri."
      icon={<HeartHandshake />}
      actions={
        <>
          <p className="text-xs font-bold text-ink-soft">Topluluğumuzu birlikte koruyalım. Bir ihlal gördüğünde bildir.</p>
          <Button asChild shape="pill" size="md">
            <Link href="/trust-and-safety#bildir">
              Bildirim Oluştur <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </>
      }
    />
  );
}
