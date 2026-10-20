"use client";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Notice } from "@/components/admin/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { readSensitiveConversationAction, type SensitiveMessage } from "./moderation-actions";

const SENDER: Record<string, string> = { user: m("Hayran"), ai: m("AI İkizi"), system: m("Sistem") };

export interface ConversationOption {
  id: string;
  messageCount: number;
  /** Sunucuda biçimlenmiş son mesaj zamanı (SSR/istemci saat dilimi farkı hidrasyon uyuşmazlığı yaratmasın). */
  lastMessageLabel: string | null;
}

/** Hassas sohbet erişim formu: vaka no + sohbet + gerekçe (≥10 karakter). Mesajlar salt okunur; erişim denetlenir. */
export function SensitiveConversationAccess({ caseNo, conversations }: { caseNo: string; conversations: ConversationOption[] }) {
  const t = useT();
  const { formatDateTime } = useFormatters();
  const uid = useId();
  const [caseNumber, setCaseNumber] = useState(caseNo);
  const [conversationId, setConversationId] = useState(conversations[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [messages, setMessages] = useState<SensitiveMessage[] | null>(null);
  const [openedAt, setOpenedAt] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    start(async () => {
      const res = await readSensitiveConversationAction({ caseNo: caseNumber, conversationId, reason });
      if (res.ok) {
        setMessages(res.data.messages);
        setOpenedAt(new Date().toISOString());
        setReason("");
        toast.success(res.message ?? t("Sohbet açıldı."));
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        setMessages(null);
      }
    });
  }

  return (
    <div className="grid gap-3.5">
      <Notice tone="danger" icon={<Lock />}>
        <b>{t("Hassas veri erişimi.")}</b> {t("Hayran sohbetleri yalnız açık bir vakayla ilişkili, gerekçeli ve denetimli olarak okunabilir. Her erişim — kim, hangi vaka, hangi gerekçe — değiştirilemez denetim kaydına yazılır.")}
      </Notice>
      <form onSubmit={submit} className="grid gap-3.5" noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label={t("Vaka numarası")} htmlFor={`${uid}-case`} required error={fieldErrors.caseNo}>
            <Input id={`${uid}-case`} value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="MOD-XXXXX" /* i18n-ignore */ maxLength={40} disabled={pending} />
          </Field>
          <Field label={t("Sohbet ID")} htmlFor={`${uid}-conv`} required error={fieldErrors.conversationId} hint={conversations.length ? t("Vakayla ilişkili sohbetlerden seçin veya ID girin.") : t("24 karakterlik sohbet kimliği.")}>
            {conversations.length > 0 ? (
              <NativeSelect id={`${uid}-conv`} value={conversationId} onChange={(e) => setConversationId(e.target.value)} disabled={pending}>
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    …{c.id.slice(-8)} · {t("{count} mesaj", { count: c.messageCount })}
                    {c.lastMessageLabel ? ` · ${c.lastMessageLabel}` : ""}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input id={`${uid}-conv`} value={conversationId} onChange={(e) => setConversationId(e.target.value)} placeholder={t("Sohbet kimliği")} maxLength={24} disabled={pending} />
            )}
          </Field>
        </div>
        <Field label={t("Erişim gerekçesi")} htmlFor={`${uid}-reason`} required error={fieldErrors.reason} hint={t("En az 10 karakter ({count}/10).", { count: reason.trim().length })}>
          <Textarea id={`${uid}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} placeholder={t("Bu sohbeti neden okumanız gerektiğini yazın")} disabled={pending} />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="dark" loading={pending} disabled={reason.trim().length < 10 || !conversationId || !caseNumber.trim()}>
            <Eye /> {t("Denetimli erişimle aç")}
          </Button>
          {messages && (
            <Button type="button" variant="ghost" onClick={() => setMessages(null)}>
              <EyeOff /> {t("Sohbeti kapat")}
            </Button>
          )}
        </div>
      </form>

      {messages && (
        <section aria-label={t("Sohbet mesajları (salt okunur)")} className="rounded-xl border border-[#f6c7cb] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f6c7cb] bg-danger-soft px-3.5 py-2.5 text-[11px] font-extrabold text-[#a1262c]">
            <span>{t("Salt okunur · {count} mesaj · {caseNo}", { count: messages.length, caseNo: caseNumber })}</span>
            <span>
              {t("Erişim denetim kaydına yazıldı")}
              {openedAt ? ` · ${formatDateTime(openedAt)}` : ""}
            </span>
          </div>
          {messages.length === 0 ? (
            <p className="p-4 text-xs text-muted">{t("Bu sohbette mesaj yok.")}</p>
          ) : (
            <ol className="grid max-h-[420px] gap-2.5 overflow-y-auto p-3.5 scrollbar-thin">
              {messages.map((msg) => (
                <li key={msg.id} className="rounded-xl bg-soft px-3 py-2.5 text-xs">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                    <b className="text-ink">{SENDER[msg.senderType] ? t(SENDER[msg.senderType]!) : msg.senderType}</b>
                    {msg.senderType === "ai" && <Badge tone="violet" size="sm">{t("AI üretimi")}</Badge>}
                    {msg.flagged && <Badge tone="danger" size="sm">{t("İşaretli")}</Badge>}
                    <time dateTime={msg.createdAt}>{formatDateTime(msg.createdAt)}</time>
                    <span>· {msg.status}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-ink-soft">{msg.body || t("(boş mesaj)")}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
