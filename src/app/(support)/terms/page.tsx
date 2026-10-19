import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("terms", "Kullanım Şartları", "HEYFANS'a katılmadan önce bilinmesi gereken temel kurallar ve karşılıklı sorumluluklar.", "/terms");
}

export default function TermsPage() {
  return (
    <LegalDocument
      slug="terms"
      eyebrow="HEYFANS / Yasal Bilgilendirme"
      title="Kullanım"
      highlight="Şartları"
      description="Platforma katılmadan önce bilinmesi gereken temel kurallar ve karşılıklı sorumluluklar."
      icon={<ScrollText />}
      actions={
        <>
          <Button asChild variant="secondary" shape="pill" size="md">
            <Link href="/privacy">Gizlilik Politikası</Link>
          </Button>
          <Button asChild shape="pill" size="md">
            <Link href="/help">Yardım Merkezi</Link>
          </Button>
        </>
      }
    />
  );
}
