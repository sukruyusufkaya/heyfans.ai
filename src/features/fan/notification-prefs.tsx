"use client";
import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/form-controls";
import { updatePreferencesAction } from "@/features/fan/actions";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";

export interface NotificationPrefsValue {
  email: boolean;
  messages: boolean;
  newContent: boolean;
  promotions: boolean;
}

const ROWS: { key: keyof NotificationPrefsValue; title: string; hint: string }[] = [
  { key: "messages", title: m("Yeni sohbet mesajları"), hint: m("AI ikizlerinden gelen mesajlar") },
  { key: "newContent", title: m("Yeni içerikler"), hint: m("Takip ettiğin içerik üreticilerinin paylaşımları") },
  { key: "email", title: m("E-posta bildirimleri"), hint: m("Önemli hesap ve ödeme duyuruları") },
  { key: "promotions", title: m("Kampanya ve öneriler"), hint: m("Pazarlama bildirimleri (isteğe bağlı)") },
];

/** Bildirim tercihleri (UserPreferences.notifications). Her anahtar anında kaydedilir; hata olursa geri alınır. */
export function NotificationPrefs({ initial }: { initial: NotificationPrefsValue }) {
  const t = useT();
  const [prefs, setPrefs] = React.useState(initial);
  const [pending, setPending] = React.useState<string | null>(null);
  const base = React.useId();

  async function toggle(key: keyof NotificationPrefsValue, value: boolean) {
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setPending(key);
    const res = await updatePreferencesAction({ notifications: { [key]: value } });
    setPending(null);
    if (!res.ok) {
      setPrefs(prev);
      toast.error(res.error);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-line-soft">
        {ROWS.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <label htmlFor={`${base}-${r.key}`} className="block cursor-pointer text-[13px] font-extrabold">
                {t(r.title)}
              </label>
              <p className="text-[11px] text-muted">{t(r.hint)}</p>
            </div>
            <Switch id={`${base}-${r.key}`} checked={prefs[r.key]} disabled={pending === r.key} onCheckedChange={(v) => toggle(r.key, v)} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] leading-relaxed text-muted">
        {t("Uygulama içi bildirimler her zaman bu sayfada listelenir; tercihlerin e-posta ve anlık bildirim gönderimi için kullanılır. Güvenlikle ilgili kritik uyarılar ayrıca iletilir.")}
      </p>
    </div>
  );
}
