import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Settings, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/display";
import { AvatarUploader, InterestPicker, NameForm } from "@/features/fan/profile-forms";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { getProfilePage } from "@/services/fan/account";

export const metadata: Metadata = { title: "Profilim" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user } = await requireUser("/app/profile");
  const p = await getProfilePage(user.id);

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow="HEYFANS / KULLANICI PROFİLİ" title="Profilim" description="Profilini ve HEYFANS kimliğini yönet." />

      <Card className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <AvatarUploader name={p.user.name} image={p.user.image} />
          <p className="mt-2 text-lg font-black tracking-[-0.03em]">{p.user.name}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {p.user.username ? `@${p.user.username} · ` : ""}
            {p.user.isCreator ? "Hayran ve içerik üreticisi hesabı" : "Hayran hesabı"}
            {!p.user.emailVerified && <Badge tone="warn" size="sm">E-posta doğrulanmadı</Badge>}
          </p>
        </div>
        <p className="max-w-xs text-[11px] leading-relaxed text-muted">
          Profil fotoğrafın herkese açık bir görsel olarak saklanır; paylaşmak istemediğin bir fotoğraf yükleme. JPEG, PNG veya WebP; en fazla 5 MB.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Card>
            <CardHeader title="Profil Bilgilerim" hint="Bilgilerini güncelle, hesabını kişiselleştir." />
            <NameForm initialName={p.user.name} email={p.user.email} username={p.user.username} memberSince={formatDate(p.user.createdAt)} />
          </Card>
          <Card>
            <CardHeader title="İlgi Alanlarım" hint="Önerilerini bu alanlara göre özelleştir." />
            {p.categories.length ? (
              <InterestPicker categories={p.categories} initial={p.interests} />
            ) : (
              <p className="text-xs text-muted">Henüz seçilebilir kategori yok.</p>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card className="hf-gradient-pink">
            <CardHeader title="Profil Özeti" />
            <dl className="grid grid-cols-3 gap-2.5 text-center">
              {[
                { v: p.stats.following, l: "Takip" },
                { v: p.stats.activeSubs, l: "Üyelik" },
                { v: p.stats.favorites, l: "Favori" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-white/80 p-3.5">
                  <dd className="text-2xl font-black tracking-[-0.04em]">{s.v}</dd>
                  <dt className="mt-0.5 text-[10px] font-bold text-muted">{s.l}</dt>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Gizlilik ve veriler" />
            <ul className="grid gap-1">
              <li>
                <Link href="/app/personalization" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-soft">
                  <Brain className="size-[18px] text-brand-500" aria-hidden />
                  <span className="flex-1">
                    <span className="block text-xs font-extrabold">Kişiselleştirme ve AI hafızası</span>
                    <span className="block text-[10px] text-muted">Hangi verilerin kullanıldığını sen belirlersin</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/app/settings" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-soft">
                  <Settings className="size-[18px] text-brand-500" aria-hidden />
                  <span className="flex-1">
                    <span className="block text-xs font-extrabold">Hesap ve ödeme ayarları</span>
                    <span className="block text-[10px] text-muted">Şifre, oturumlar, bildirimler</span>
                  </span>
                </Link>
              </li>
            </ul>
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-soft p-3 text-[11px] leading-relaxed text-muted-strong">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden /> Profil bilgilerini ve kişiselleştirme tercihlerini istediğin zaman sen yönetirsin.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
