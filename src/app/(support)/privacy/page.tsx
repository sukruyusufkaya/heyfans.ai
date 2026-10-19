import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("privacy", "Gizlilik Politikası", "HEYFANS'ta kişisel verilerinin nasıl toplandığı, işlendiği ve haklarını nasıl kullanabileceğin. Verilerin üzerinde şeffaflık ve kontrol.", "/privacy");
}

export default function PrivacyPage() {
  return (
    <LegalDocument
      slug="privacy"
      eyebrow="HEYFANS / Yasal Bilgilendirme"
      title="Gizlilik"
      highlight="Politikası"
      description="Verilerin üzerinde şeffaflık ve kontrol için tasarlanan bilgilendirme merkezi."
      icon={<ShieldCheck />}
      actions={
        <>
          <Button asChild variant="secondary" shape="pill" size="md">
            <Link href="/cookies">
              <Lock /> Gizlilik tercihlerini yönet
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" shape="pill" size="md">
              <Link href="/contact?category=safety&subject=Ki%C5%9Fisel%20veri%20(KVKK)%20talebi">Veri talebi oluştur</Link>
            </Button>
            <Button asChild shape="pill" size="md">
              <Link href="/app/settings">Veri ve gizlilik ayarları</Link>
            </Button>
          </div>
        </>
      }
    />
  );
}
