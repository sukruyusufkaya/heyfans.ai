import "server-only";
import { env } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { DevOutbox } from "@/models/platform";
import { EMAIL_LOGO } from "./logo";
import { isLocale, LOCALE_META, type Locale } from "@/i18n/config";
import { getTranslatorFor } from "@/i18n/server";
import type { MessageParams } from "@/i18n/translate";

export interface InlineImage {
  cid: string;
  filename: string;
  contentType: string;
  base64: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: string;
  /** HTML içinde `cid:<cid>` ile başvurulan gömülü görseller (logo). */
  inline?: InlineImage[];
}

/** Gömülü görselleri tarayıcıda gösterilebilir veri adresine çevirir (yerel önizleme için). */
const withDataUris = (html: string, inline: InlineImage[] = []) => inline.reduce((h, i) => h.replaceAll(`cid:${i.cid}`, `data:${i.contentType};base64,${i.base64}`), html);

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

/** Geliştirme/demo: e-postaları `devOutbox` koleksiyonuna yazar; `/dev/outbox` ekranından görülür. */
class OutboxProvider implements EmailProvider {
  readonly name = "outbox";
  async send(message: EmailMessage) {
    await connectDb();
    const { inline, ...rest } = message;
    await DevOutbox.create({ ...rest, html: withDataUris(message.html, inline) });
    if (env().NODE_ENV !== "test") console.info(`[email:outbox] ${message.kind} → ${message.to}: ${message.subject}`);
  }
}

class ResendProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private readonly apiKey: string) {}
  async send(message: EmailMessage) {
    const { Resend } = await import("resend");
    const client = new Resend(this.apiKey);
    const { error } = await client.emails.send({
      from: env().EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: (message.inline ?? []).map((i) => ({ filename: i.filename, content: Buffer.from(i.base64, "base64"), contentType: i.contentType, contentId: i.cid })),
    });
    if (error) throw new Error(`E-posta gönderilemedi: ${error.message}`); // i18n-ignore (iç hata; kullanıcıya genel mesaj döner)
  }
}

export function getEmailProvider(): EmailProvider {
  const e = env();
  if (e.EMAIL_PROVIDER === "resend") {
    if (!e.RESEND_API_KEY) throw new Error("EMAIL_PROVIDER=resend için RESEND_API_KEY gerekli"); // i18n-ignore
    return new ResendProvider(e.RESEND_API_KEY);
  }
  // outbox yalnız yerel geliştirmede: e-postalar /dev/outbox'ta görünür. Demo/üretimde gerçek gönderim şart.
  if (e.APP_MODE !== "development") throw new Error("EMAIL_PROVIDER=outbox yalnız APP_MODE=development iken kullanılabilir"); // i18n-ignore
  return new OutboxProvider();
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

interface LayoutCopy {
  locale: Locale;
  title: string;
  intro: string;
  ctaLabel: string;
  url: string;
  outro: string;
  fallback: string;
}

function layout({ locale, title, intro, ctaLabel, url, outro, fallback }: LayoutCopy) {
  const safeUrl = escapeHtml(url);
  const { dir } = LOCALE_META[locale];
  const align = dir === "rtl" ? "right" : "left";
  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#f8f7fa;font-family:Arial,'Noto Sans Arabic',Tahoma,sans-serif;color:#19111d">
<table width="100%" cellpadding="0" cellspacing="0" dir="${dir}"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" dir="${dir}" style="background:#fff;border:1px solid #eee8f0;border-radius:16px;padding:32px;text-align:${align}">
<tr><td dir="ltr" style="text-align:${align}"><img src="cid:${EMAIL_LOGO.cid}" width="${EMAIL_LOGO.width}" height="${EMAIL_LOGO.height}" alt="" style="border:0;display:inline-block;vertical-align:middle"/> <span style="font-size:26px;font-weight:800;letter-spacing:-1px;vertical-align:middle;color:#1d1328">Hey<span style="color:#ec0088">fans</span></span></td></tr>
<tr><td style="padding-top:20px;font-size:20px;font-weight:800">${escapeHtml(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:14px;line-height:1.6;color:#5f5764">${escapeHtml(intro)}</td></tr>
<tr><td style="padding:24px 0"><a href="${safeUrl}" style="background:#ec0088;color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:10px;display:inline-block">${escapeHtml(ctaLabel)}</a></td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:#8e8593">${escapeHtml(outro)}<br/><br/>${escapeHtml(fallback)}<br/><span dir="ltr" style="word-break:break-all">${safeUrl}</span></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${title}

${intro}

${ctaLabel}: ${url}

${outro}`;
  return { html, text };
}

/** Hesap e-postaları alıcının hesap dilinde gönderilir (kayıtta konuma göre atanır, dil seçiciyle değişir). */
export async function sendAuthEmail(input: { kind: "verify_email" | "reset_password"; to: string; name: string; url: string; locale?: string | null }) {
  const locale: Locale = isLocale(input.locale) ? input.locale : "tr";
  const t = await getTranslatorFor(locale);
  const first = input.name?.split(" ")[0]?.trim();
  const fallback = t("Bağlantı çalışmazsa tarayıcınıza yapıştırın:");
  const content =
    input.kind === "verify_email"
      ? {
          subject: t("HEYFANS hesabını doğrula"),
          ...layout({
            locale,
            title: first ? t("{name}, hesabını doğrula", { name: first }) : t("Hesabını doğrula"),
            intro: t("HEYFANS'a hoş geldin! Hesabını etkinleştirmek için e-posta adresini doğrulaman gerekiyor."),
            ctaLabel: t("E-postamı doğrula"),
            url: input.url,
            outro: t("Bu bağlantı 24 saat geçerlidir. Bu kaydı sen yapmadıysan bu e-postayı yok sayabilirsin."),
            fallback,
          }),
        }
      : {
          subject: t("HEYFANS şifre sıfırlama"),
          ...layout({
            locale,
            title: t("Şifreni sıfırla"),
            intro: t("Hesabın için bir şifre sıfırlama talebi aldık. Yeni şifre belirlemek için aşağıdaki düğmeyi kullan."),
            ctaLabel: t("Yeni şifre belirle"),
            url: input.url,
            outro: t("Bu bağlantı 30 dakika geçerlidir. Talebi sen yapmadıysan şifren değişmeden kalır."),
            fallback,
          }),
        };
  await getEmailProvider().send({ to: input.to, subject: content.subject, html: content.html, text: content.text, kind: input.kind, inline: [EMAIL_LOGO] });
}

/**
 * Bildirim e-postası. Metinler kaynak (Türkçe) ICU kalıbıdır; alıcının dilinde çevrilir.
 * `params` kalıptaki değişkenleri doldurur.
 */
export async function sendPlainEmail(input: {
  to: string;
  locale?: string | null;
  subject: string;
  title: string;
  body: string;
  ctaLabel: string;
  url: string;
  params?: MessageParams;
  kind?: string;
}) {
  const locale: Locale = isLocale(input.locale) ? input.locale : "tr";
  const t = await getTranslatorFor(locale);
  const content = layout({
    locale,
    title: t(input.title, input.params),
    intro: t(input.body, input.params),
    ctaLabel: t(input.ctaLabel, input.params),
    url: input.url,
    outro: t("Bu e-postayı HEYFANS hesabındaki bildirim tercihlerine göre aldın."),
    fallback: t("Bağlantı çalışmazsa tarayıcınıza yapıştırın:"),
  });
  await getEmailProvider().send({ to: input.to, subject: t(input.subject, input.params), html: content.html, text: content.text, kind: input.kind ?? "notification", inline: [EMAIL_LOGO] });
}
