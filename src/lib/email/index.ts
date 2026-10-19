import "server-only";
import { env } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { DevOutbox } from "@/models/platform";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

/** Geliştirme/demo: e-postaları `devOutbox` koleksiyonuna yazar; `/dev/outbox` ekranından görülür. */
class OutboxProvider implements EmailProvider {
  readonly name = "outbox";
  async send(message: EmailMessage) {
    await connectDb();
    await DevOutbox.create(message);
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
    });
    if (error) throw new Error(`E-posta gönderilemedi: ${error.message}`);
  }
}

export function getEmailProvider(): EmailProvider {
  const e = env();
  if (e.EMAIL_PROVIDER === "resend") {
    if (!e.RESEND_API_KEY) throw new Error("EMAIL_PROVIDER=resend için RESEND_API_KEY gerekli");
    return new ResendProvider(e.RESEND_API_KEY);
  }
  // outbox yalnız yerel geliştirmede: e-postalar /dev/outbox'ta görünür. Demo/üretimde gerçek gönderim şart.
  if (e.APP_MODE !== "development") throw new Error("EMAIL_PROVIDER=outbox yalnız APP_MODE=development iken kullanılabilir");
  return new OutboxProvider();
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, intro: string, ctaLabel: string, url: string, outro: string) {
  const safeUrl = escapeHtml(url);
  const logo = escapeHtml(`${env().APP_URL.replace(/\/$/, "")}/brand/heyfans-mark.png`);
  const html = `<!doctype html><html lang="tr"><body style="margin:0;background:#f8f7fa;font-family:Arial,sans-serif;color:#19111d">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee8f0;border-radius:16px;padding:32px">
<tr><td><img src="${logo}" width="38" height="32" alt="" style="border:0;vertical-align:middle"/> <span style="font-size:26px;font-weight:800;letter-spacing:-1px;vertical-align:middle;color:#1d1328">Hey<span style="color:#ec0088">fans</span></span></td></tr>
<tr><td style="padding-top:20px;font-size:20px;font-weight:800">${escapeHtml(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:14px;line-height:1.6;color:#5f5764">${escapeHtml(intro)}</td></tr>
<tr><td style="padding:24px 0"><a href="${safeUrl}" style="background:#ec0088;color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:10px;display:inline-block">${escapeHtml(ctaLabel)}</a></td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:#8e8593">${escapeHtml(outro)}<br/><br/>Bağlantı çalışmazsa tarayıcınıza yapıştırın:<br/><span style="word-break:break-all">${safeUrl}</span></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${ctaLabel}: ${url}\n\n${outro}`;
  return { html, text };
}

export async function sendAuthEmail(input: { kind: "verify_email" | "reset_password"; to: string; name: string; url: string }) {
  const first = input.name?.split(" ")[0] || "Merhaba";
  const content =
    input.kind === "verify_email"
      ? {
          subject: "HEYFANS hesabını doğrula",
          ...layout(
            `${first}, hesabını doğrula`,
            "HEYFANS'a hoş geldin! Hesabını etkinleştirmek için e-posta adresini doğrulaman gerekiyor.",
            "E-postamı doğrula",
            input.url,
            "Bu bağlantı 24 saat geçerlidir. Bu kaydı sen yapmadıysan bu e-postayı yok sayabilirsin.",
          ),
        }
      : {
          subject: "HEYFANS şifre sıfırlama",
          ...layout(
            "Şifreni sıfırla",
            "Hesabın için bir şifre sıfırlama talebi aldık. Yeni şifre belirlemek için aşağıdaki düğmeyi kullan.",
            "Yeni şifre belirle",
            input.url,
            "Bu bağlantı 30 dakika geçerlidir. Talebi sen yapmadıysan şifren değişmeden kalır.",
          ),
        };
  await getEmailProvider().send({ to: input.to, subject: content.subject, html: content.html, text: content.text, kind: input.kind });
}

export async function sendPlainEmail(to: string, subject: string, title: string, body: string, ctaLabel: string, url: string, kind = "notification") {
  const content = layout(title, body, ctaLabel, url, "Bu e-postayı HEYFANS hesabındaki bildirim tercihlerine göre aldın.");
  await getEmailProvider().send({ to, subject, html: content.html, text: content.text, kind });
}
