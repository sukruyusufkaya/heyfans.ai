"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Eye, Trash2 } from "lucide-react";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { AiTwinLabel, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/display";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { MediaUploader, type UploadedFile } from "@/components/studio/media-uploader";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { TagInput } from "@/components/studio/tag-input";
import { firstError, useRun } from "@/components/studio/use-run";
import { cn } from "@/lib/utils";
import { updateProfileAction } from "./business-actions";

const PLATFORMS = [
  { key: "instagram", label: "Instagram", ph: "kullaniciadi" },
  { key: "tiktok", label: "TikTok", ph: "kullaniciadi" },
  { key: "youtube", label: "YouTube", ph: "kanal adı" },
  { key: "x", label: "X / Twitter", ph: "kullaniciadi" },
  { key: "website", label: "Web sitesi", ph: "alanadi.com" },
] as const;
type Platform = (typeof PLATFORMS)[number]["key"];

const LANGS = [
  { v: "tr", l: "Türkçe" },
  { v: "en", l: "English" },
  { v: "de", l: "Deutsch" },
  { v: "fr", l: "Français" },
  { v: "es", l: "Español" },
  { v: "ar", l: "العربية" },
  { v: "ru", l: "Русский" },
];

export interface ProfileInitial {
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  categories: string[];
  tags: string[];
  location: string;
  languages: string[];
  socialLinks: { platform: Platform; handle: string; url: string; verified: boolean }[];
  avatarUrl: string | null;
  coverUrl: string | null;
  verified: boolean;
  twinLive: boolean;
}

export function ProfileEditor({ initial, categories }: { initial: ProfileInitial; categories: { slug: string; name: string }[] }) {
  const { run, pending, fieldErrors } = useRun();
  const [f, setF] = useState({
    displayName: initial.displayName,
    headline: initial.headline,
    bio: initial.bio,
    categories: initial.categories,
    tags: initial.tags,
    location: initial.location,
    languages: initial.languages,
  });
  const [links, setLinks] = useState<Record<Platform, { handle: string; url: string }>>(() => {
    const base = Object.fromEntries(PLATFORMS.map((p) => [p.key, { handle: "", url: "" }])) as Record<Platform, { handle: string; url: string }>;
    for (const l of initial.socialLinks) base[l.platform] = { handle: l.handle, url: l.url };
    return base;
  });
  // undefined: değişmedi · null: kaldır · dosya: yeni
  const [avatar, setAvatar] = useState<UploadedFile | null | undefined>(undefined);
  const [cover, setCover] = useState<UploadedFile | null | undefined>(undefined);
  const [saved, setSaved] = useState(() => JSON.stringify({ f, links }));
  const dirty = useMemo(() => JSON.stringify({ f, links }) !== saved || avatar !== undefined || cover !== undefined, [f, links, saved, avatar, cover]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const avatarUrl = avatar === null ? null : avatar?.url ?? initial.avatarUrl;
  const coverUrl = cover === null ? null : cover?.url ?? initial.coverUrl;

  async function save() {
    const body = {
      ...f,
      socialLinks: PLATFORMS.filter((p) => links[p.key].handle.trim()).map((p) => ({ platform: p.key, handle: links[p.key].handle.trim(), url: links[p.key].url.trim() })),
      avatarAssetId: avatar === undefined ? undefined : avatar?.assetId ?? null,
      coverAssetId: cover === undefined ? undefined : cover?.assetId ?? null,
    };
    await run(() => updateProfileAction(body), {
      onOk: () => {
        setSaved(JSON.stringify({ f, links }));
        setAvatar(undefined);
        setCover(undefined);
      },
    });
  }

  const catNames = f.categories.map((s) => categories.find((c) => c.slug === s)?.name ?? s);
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title="İçerik Üreticisi Profili"
        description="Görünür profilini, biyografini ve herkese açık bağlantılarını düzenle."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/creators/${initial.username}`}>
                <Eye /> Herkese açık profili aç
              </Link>
            </Button>
            <Button onClick={save} loading={pending} disabled={!dirty}>
              <Check /> Değişiklikleri kaydet
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title="Profil görselleri" hint="Hayranların seni ilk gördüğü alanı kişiselleştir. Yalnız hakkına sahip olduğun görselleri yükle." />
            <div className="relative aspect-[3/1] overflow-hidden rounded-2xl bg-soft">
              <CreatorPhoto src={coverUrl} name={f.displayName || initial.username} rounded="rounded-2xl" showMonogram={false} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <MediaUploader purpose="cover" value={[]} onChange={(v) => setCover(v[0])} accept="image/jpeg,image/png,image/webp" label="Kapak görselini değiştir" hint="JPG, PNG, WEBP · 3:1 önerilir" compact disabled={pending} />
                {coverUrl && (
                  <button type="button" onClick={() => setCover(null)} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-danger hover:underline">
                    <Trash2 className="size-3.5" /> Kapağı kaldır
                  </button>
                )}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <Avatar src={avatarUrl} name={f.displayName || initial.username} size={52} />
                  <p className="text-[12px] font-extrabold">Profil fotoğrafı</p>
                </div>
                <MediaUploader purpose="avatar" value={[]} onChange={(v) => setAvatar(v[0])} accept="image/jpeg,image/png,image/webp" label="Fotoğrafı değiştir" hint="Kare görsel önerilir" compact disabled={pending} />
                {avatarUrl && (
                  <button type="button" onClick={() => setAvatar(null)} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-danger hover:underline">
                    <Trash2 className="size-3.5" /> Fotoğrafı kaldır
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 text-[10px] text-muted">Seçtiğin görseller “Değişiklikleri kaydet” ile profiline uygulanır.</p>
          </Card>

          <Card>
            <CardHeader title="Genel profil bilgileri" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Görünen ad" htmlFor="pf-name" required error={firstError(fieldErrors, "displayName")}>
                <Input id="pf-name" value={f.displayName} maxLength={80} onChange={(e) => set("displayName", e.target.value)} />
              </Field>
              <Field label="Kullanıcı adı" htmlFor="pf-user" hint="Kullanıcı adı değiştirilemez">
                <Input id="pf-user" value={`@${initial.username}`} readOnly disabled />
              </Field>
              <Field label="Kısa başlık" htmlFor="pf-head" className="sm:col-span-2" hint={`${f.headline.length}/140`} error={firstError(fieldErrors, "headline")}>
                <Input id="pf-head" value={f.headline} maxLength={140} onChange={(e) => set("headline", e.target.value)} placeholder="Örn. Seyahat ve yaşam tarzı" />
              </Field>
              <Field label="Hakkımda" htmlFor="pf-bio" className="sm:col-span-2" hint={`${f.bio.length}/1500`} error={firstError(fieldErrors, "bio")}>
                <Textarea id="pf-bio" value={f.bio} maxLength={1500} onChange={(e) => set("bio", e.target.value)} className="min-h-28" />
              </Field>
              <Field label="Konum (isteğe bağlı)" htmlFor="pf-loc">
                <Input id="pf-loc" value={f.location} maxLength={80} onChange={(e) => set("location", e.target.value)} placeholder="İstanbul, Türkiye" />
              </Field>
              <div>
                <p className="mb-2 text-[11px] font-extrabold text-ink-soft">Diller</p>
                <div role="group" aria-label="Diller" className="flex flex-wrap gap-1.5">
                  {LANGS.map((l) => {
                    const on = f.languages.includes(l.v);
                    return (
                      <button key={l.v} type="button" aria-pressed={on} onClick={() => set("languages", on ? f.languages.filter((x) => x !== l.v) : f.languages.length < 5 ? [...f.languages, l.v] : f.languages)} className={cn("rounded-full px-3 py-1.5 text-[11px] font-extrabold", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
                        {l.l}
                      </button>
                    );
                  })}
                </div>
                {firstError(fieldErrors, "languages") && <p className="mt-1.5 text-[11px] font-semibold text-danger">{firstError(fieldErrors, "languages")}</p>}
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-[11px] font-extrabold text-ink-soft">
                  Kategoriler <span className="font-medium text-muted">(en fazla 5)</span>
                </p>
                <div role="group" aria-label="Kategoriler" className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const on = f.categories.includes(c.slug);
                    return (
                      <button key={c.slug} type="button" aria-pressed={on} onClick={() => set("categories", on ? f.categories.filter((x) => x !== c.slug) : f.categories.length < 5 ? [...f.categories, c.slug] : f.categories)} className={cn("rounded-full px-3 py-1.5 text-[11px] font-extrabold", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="İlgi alanları / etiketler" htmlFor="pf-tags" className="sm:col-span-2" hint="Enter ile ekle · en fazla 12" error={firstError(fieldErrors, "tags")}>
                <TagInput id="pf-tags" value={f.tags} onChange={(v) => set("tags", v)} max={12} maxLength={30} placeholder="Örn. seyahat" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Sosyal medya ve bağlantılar" hint="Herkese açık profilinde gösterilir. Doğrulama yönetim ekibi tarafından yapılır." />
            <div className="grid gap-3">
              {PLATFORMS.map((p) => {
                const verified = initial.socialLinks.find((l) => l.platform === p.key && l.handle === links[p.key].handle)?.verified;
                return (
                  <div key={p.key} className="grid items-start gap-2 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <label htmlFor={`sl-${p.key}`} className="pt-3 text-[12px] font-extrabold">
                      {p.label}
                    </label>
                    <Input id={`sl-${p.key}`} value={links[p.key].handle} maxLength={120} placeholder={p.ph} onChange={(e) => setLinks((s) => ({ ...s, [p.key]: { ...s[p.key], handle: e.target.value } }))} />
                    <Input aria-label={`${p.label} bağlantısı (isteğe bağlı)`} value={links[p.key].url} maxLength={500} placeholder="https://… (isteğe bağlı)" inputMode="url" onChange={(e) => setLinks((s) => ({ ...s, [p.key]: { ...s[p.key], url: e.target.value } }))} />
                    <span className="pt-2.5">{verified ? <Badge tone="green" size="sm">Doğrulandı</Badge> : links[p.key].handle ? <Badge tone="gray" size="sm">Doğrulanmadı</Badge> : null}</span>
                  </div>
                );
              })}
              {Object.keys(fieldErrors).some((k) => k.startsWith("socialLinks")) && <p className="text-[11px] font-semibold text-danger">Sosyal bağlantılardaki hataları düzelt (bağlantılar http(s) ile başlamalı).</p>}
            </div>
          </Card>
          <div className="flex justify-end gap-3">
            {dirty && <span className="self-center text-[11px] font-semibold text-warning">Kaydedilmemiş değişiklikler var</span>}
            <Button onClick={save} loading={pending} disabled={!dirty}>
              <Check /> Değişiklikleri kaydet
            </Button>
          </div>
        </div>

        {/* Canlı önizleme */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card padded={false} className="overflow-hidden">
            <p className="px-5 pt-4 text-[10px] font-black uppercase tracking-[0.16em] text-brand-500">Canlı önizleme</p>
            <div className="relative mt-3 aspect-[16/6] bg-soft">
              <CreatorPhoto src={coverUrl} name={f.displayName || initial.username} rounded="rounded-none" showMonogram={false} />
            </div>
            <div className="relative px-5 pb-5">
              <div className="-mt-9">
                <Avatar src={avatarUrl} name={f.displayName || initial.username} size={72} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-[18px] font-black tracking-[-0.03em]">
                  {f.displayName || "Görünen ad"} {initial.verified && <span className="text-brand-500" aria-label="Doğrulanmış">✦</span>}
                </p>
                {initial.twinLive && <AiTwinLabel />}
              </div>
              <p className="text-[11px] text-muted">
                @{initial.username}
                {f.location && ` · ${f.location}`}
              </p>
              {f.headline && <p className="mt-2 text-[12px] font-bold text-ink-soft">{f.headline}</p>}
              {f.bio && <p className="mt-1.5 line-clamp-4 text-[12px] leading-relaxed text-muted-strong">{f.bio}</p>}
              {catNames.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Kategoriler">
                  {catNames.map((c) => (
                    <li key={c} className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-extrabold text-brand-600">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              {f.tags.length > 0 && <p className="mt-2 text-[11px] text-muted">{f.tags.map((t) => `#${t}`).join(" ")}</p>}
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href={`/creators/${initial.username}`}>
                  <Eye /> Profili görüntüle
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
