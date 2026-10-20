"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { useT } from "@/i18n/client";
import { updateSettingsAction } from "./settings-actions";

interface PackRow {
  key: string;
  credits: string;
  priceTl: string;
  bonusCredits: string;
  isPopular: boolean;
}

const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));

/** Kredi paketleri, kredi değeri ve kayıt bonusu editörü. Doğrulama sunucuda (Zod) yapılır. */
export function CreditPacksEditor({
  initial,
  disabled,
}: {
  initial: { valueTl: number; signupBonus: number; packs: { key: string; credits: number; priceTl: number; bonusCredits: number; isPopular: boolean }[] };
  disabled?: boolean;
}) {
  const t = useT();
  const uid = useId();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [valueTl, setValueTl] = useState(String(initial.valueTl));
  const [signupBonus, setSignupBonus] = useState(String(initial.signupBonus));
  const [packs, setPacks] = useState<PackRow[]>(initial.packs.map((p) => ({ key: p.key, credits: String(p.credits), priceTl: String(p.priceTl), bonusCredits: String(p.bonusCredits), isPopular: p.isPopular })));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string[]>>({});

  const setPack = (i: number, patch: Partial<PackRow>) => setPacks((p) => p.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const popular = (i: number, on: boolean) => setPacks((p) => p.map((x, k) => ({ ...x, isPopular: on ? k === i : k === i ? false : x.isPopular })));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFe({});
    start(async () => {
      const res = await updateSettingsAction({
        group: "credits",
        valueTl: num(valueTl),
        signupBonus: num(signupBonus),
        packs: packs.map((p) => ({ key: p.key, credits: num(p.credits), priceTl: num(p.priceTl), bonusCredits: num(p.bonusCredits) ?? 0, isPopular: p.isPopular })),
        reason,
      });
      if (res.ok) {
        toast.success(res.message ?? t("Kaydedildi."));
        setReason("");
        router.refresh();
      } else {
        setError(res.error);
        setFe(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("1 kredinin değeri (₺)")} htmlFor={`${uid}-val`} error={fe.valueTl} hint={t("Hak ediş hesabında 1 kredinin TL karşılığı (ör. 0,40).")}>
          <Input id={`${uid}-val`} inputMode="decimal" value={valueTl} onChange={(e) => setValueTl(e.target.value)} disabled={disabled || pending} />
        </Field>
        <Field label={t("Kayıt bonusu (kredi)")} htmlFor={`${uid}-bonus`} error={fe.signupBonus} hint={t("Yeni hesaba hediye edilen kredi.")}>
          <Input id={`${uid}-bonus`} inputMode="numeric" value={signupBonus} onChange={(e) => setSignupBonus(e.target.value)} disabled={disabled || pending} />
        </Field>
      </div>

      <fieldset className="grid gap-2.5">
        <legend className="mb-1 text-[11px] font-extrabold text-ink-soft">{t("Kredi paketleri ({count})", { count: packs.length })}</legend>
        <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_auto_auto] gap-2.5 px-1 text-[10px] font-black uppercase tracking-wider text-muted md:grid">
          <span>{t("Anahtar")}</span>
          <span>{t("Kredi")}</span>
          <span>{t("Fiyat (₺)")}</span>
          <span>{t("Bonus kredi")}</span>
          <span>{t("Popüler")}</span>
          <span />
        </div>
        {packs.map((p, i) => (
          <div key={i} className="grid gap-2.5 rounded-xl border border-line bg-soft/50 p-3 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto_auto] md:items-center md:border-0 md:bg-transparent md:p-0">
            <Input aria-label={t("Paket {n} anahtarı", { n: i + 1 })} placeholder="credits_100" /* i18n-ignore */ value={p.key} onChange={(e) => setPack(i, { key: e.target.value })} disabled={disabled || pending} aria-invalid={fe[`packs.${i}.key`] ? true : undefined} />
            <Input aria-label={t("Paket {n} kredi sayısı", { n: i + 1 })} inputMode="numeric" placeholder={t("Kredi")} value={p.credits} onChange={(e) => setPack(i, { credits: e.target.value })} disabled={disabled || pending} aria-invalid={fe[`packs.${i}.credits`] ? true : undefined} />
            <Input aria-label={t("Paket {n} fiyatı (TL)", { n: i + 1 })} inputMode="decimal" placeholder={t("Fiyat")} value={p.priceTl} onChange={(e) => setPack(i, { priceTl: e.target.value })} disabled={disabled || pending} aria-invalid={fe[`packs.${i}.priceTl`] ? true : undefined} />
            <Input aria-label={t("Paket {n} bonus kredisi", { n: i + 1 })} inputMode="numeric" placeholder={t("Bonus")} value={p.bonusCredits} onChange={(e) => setPack(i, { bonusCredits: e.target.value })} disabled={disabled || pending} />
            <label className="flex items-center gap-2 text-[11px] font-bold text-muted-strong md:justify-center">
              <Checkbox checked={p.isPopular} onCheckedChange={(c) => popular(i, c === true)} aria-label={t("Paket {n} popüler", { n: i + 1 })} disabled={disabled || pending} />
              <span className="md:sr-only">{t("Popüler")}</span>
            </label>
            <Button type="button" size="icon-sm" variant="ghost" className="text-danger" onClick={() => setPacks((x) => x.filter((_, k) => k !== i))} disabled={disabled || pending || packs.length <= 1} aria-label={t("Paket {n} sil", { n: i + 1 })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        {Object.entries(fe)
          .filter(([k]) => k.startsWith("packs"))
          .map(([k, v]) => (
            <p key={k} role="alert" className="text-[11px] font-semibold text-danger">
              {k.startsWith("packs.") ? `${t("Paket {n}:", { n: Number(k.split(".")[1]) + 1 })} ` : ""}
              {v[0]}
            </p>
          ))}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setPacks((p) => [...p, { key: "", credits: "", priceTl: "", bonusCredits: "0", isPopular: false }])} disabled={disabled || pending || packs.length >= 12}>
          <Plus /> {t("Paket ekle")}
        </Button>
      </fieldset>

      {!disabled && (
        <>
          <Field label={t("Değişiklik gerekçesi")} htmlFor={`${uid}-reason`} required error={fe.reason} hint={t("En az 5 karakter. Önce/sonra değerleriyle denetim kaydına yazılır.")}>
            <Textarea id={`${uid}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} disabled={pending} />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
              {error}
            </p>
          )}
          <div>
            <Button type="submit" loading={pending} disabled={reason.trim().length < 5}>
              {t("Kredi Ayarlarını Kaydet")}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
