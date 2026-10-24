"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Send, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/creator/category-icon";
import { authClient } from "@/lib/auth/client";
import { CONTACT_PREFERENCES } from "@/lib/creator-contact";
import { cn } from "@/lib/utils";
import { submitBirthDateAction } from "@/features/auth/actions";
import { answerCreatorAssistantAction, refreshCreatorAssistantAction, submitCreatorAssistantAction } from "@/features/auth/creator-actions";
import { NETWORK_ERROR } from "@/features/auth/client-errors";
import { ASSISTANT_STEPS, EMOJI_OPTIONS, GREETING_TEMPLATES, TONE_PRESETS, type AssistantStep } from "@/features/auth/constants";
import {
  BioComposer,
  BirthDateComposer,
  CategoriesComposer,
  ConsentsComposer,
  ContactComposer,
  GreetingComposer,
  LinkSummary,
  LocationComposer,
  PhotoComposer,
  SocialsComposer,
  TextComposer,
  ToneComposer,
  TopicsComposer,
  UsernameComposer,
  type ComposerProps,
  type CreatorCategory,
  type Say,
} from "@/features/auth/creator-assistant-composers";
import { m } from "@/i18n/m";
import { useT } from "@/i18n/client";
import type { Translator } from "@/i18n/translate";
import type { CreatorAssistantView } from "@/services/auth/creator-assistant";

type Step = AssistantStep | "review";

/** Asistanın her adımdaki sorusu (yanıtlanan adımlar sohbet geçmişinde de bu metinle görünür). */
const QUESTIONS: Record<AssistantStep, string> = {
  birthDate: m("Başlamadan önce küçük bir kontrol: doğum tarihin nedir? HEYFANS'ta içerik üreticisi olmak için 18 yaşını doldurmuş olmalısın."),
  displayName: m("Takipçilerin seni hangi isimle tanıyor? Bu ad profilinde ve AI ikizinde görünecek."),
  username: m("Profil adresin ne olsun? Sana birkaç öneri hazırladım; istersen kendin de yazabilirsin."),
  avatar: m("Şimdi bir profil fotoğrafı yükler misin? Yüzünün net göründüğü bir fotoğraf en iyisi."),
  cover: m("Profilinin üst kısmında görünecek bir kapak görseli eklemek ister misin?"),
  categories: m("Hangi alanlarda içerik üretiyorsun?"),
  socials: m("En aktif olduğun platform hangisi?"),
  bio: m("Kendini birkaç cümleyle anlatır mısın? Ne üretiyorsun, takipçilerin senden ne bekleyebilir?"),
  location: m("Nerede yaşıyorsun? Şehir yazman yeterli; istemezsen geçebilirsin."),
  tone: m("AI ikizin takipçilerinle nasıl konuşsun? Sana en yakın tarzı seç."),
  greeting: m("AI ikizin bir hayranla ilk tanıştığında ne desin? Senin için bir taslak hazırladım:"),
  topics: m("AI ikizinin hiç konuşmamasını istediğin konular var mı? Seç ya da kendin ekle."),
  contact: m("Başvurunla ilgili sana ulaşabilmemiz için telefon numaran nedir?"),
  legalName: m("Kimlik doğrulaması için resmi adın ve soyadın nedir? Bu bilgi profilinde görünmez; yalnızca inceleme ekibimiz görür."),
  consents: m("Son adım: AI ikizinin senin adına konuşabilmesi için açık rızan gerekiyor. Lütfen metni oku:"),
};

/** Karşılama mesajı taslağı: kayıtlı mesaj varsa o, yoksa seçilen tona göre şablon (+ emoji tercihi). */
function greetingDraft(view: CreatorAssistantView, t: Translator) {
  if (view.values.greeting) return view.values.greeting;
  const tone = view.values.tone ?? "warm";
  const text = t(GREETING_TEMPLATES[tone], { name: view.values.displayName });
  return view.values.emoji === "none" ? text : `${text} ${TONE_PRESETS[tone].emoji}`;
}

interface AssistantProps {
  initialView: CreatorAssistantView;
  categories: CreatorCategory[];
  firstName: string;
  personaConsentText: string;
  knowledgeConsentText: string;
  todayIso: string;
}

/**
 * Creator karşılama asistanı: e-posta doğrulamasından sonraki ilk girişte sohbet yoluyla profil ve AI ikizi kurulur.
 * Her yanıt anında sunucuya yazılır; sayfa yenilense de ilk yanıtlanmamış sorudan devam edilir.
 */
export function CreatorAssistant(props: AssistantProps) {
  const t = useT();
  const [view, setView] = React.useState(props.initialView);
  const [editing, setEditing] = React.useState<AssistantStep | null>(null);
  const [blocked, setBlocked] = React.useState(false);
  const answered = new Set(view.answered);
  const step: Step = editing ?? ASSISTANT_STEPS.find((s) => !answered.has(s)) ?? "review";
  const total = ASSISTANT_STEPS.length;

  const transcript = (
    <>
      <BotBubble>
        <p className="font-extrabold">{t("Merhaba {name}! Ben HEYFANS asistanın.", { name: props.firstName })}</p>
        <p className="mt-1">{t("Birkaç dakikada profilini ve AI ikizini birlikte kuracağız. Her yanıtın anında kaydedilir; ara verirsen kaldığın yerden devam ederiz.")}</p>
      </BotBubble>
      {view.application?.status === "changes_requested" && (
        <BotBubble tone="warn">
          <p className="font-extrabold">{t("Başvurun için düzenleme istendi")}</p>
          {view.application.decisionNote && <p className="mt-0.5">{`"${view.application.decisionNote}"`}</p>}
          <p className="mt-0.5">{t("Gerekli değişiklikleri yapıp başvurunu yeniden gönderebilirsin.")}</p>
        </BotBubble>
      )}
      {ASSISTANT_STEPS.filter((s) => answered.has(s)).map((s) => (
        <React.Fragment key={s}>
          <BotBubble>{t(QUESTIONS[s])}</BotBubble>
          <MeBubble bare={(s === "avatar" && !!view.values.avatarUrl) || (s === "cover" && !!view.values.coverUrl)} onEdit={s === "birthDate" || blocked ? undefined : () => setEditing(s)} editing={editing === s}>
            <AnswerSummary step={s} view={view} categories={props.categories} />
          </MeBubble>
        </React.Fragment>
      ))}
    </>
  );

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[480px] flex-col sm:h-[calc(100dvh-11.5rem)] lg:h-[calc(100dvh-14.5rem)] lg:max-h-[714px] lg:min-h-[520px]">
      <header className="flex items-center gap-3 border-b border-line pb-4">
        <AssistantAvatar size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-[17px] font-extrabold leading-tight tracking-[-0.02em] text-ink">{t("HEYFANS Asistanı")}</h1>
          <p className="text-xs text-muted-strong">{t("Profilini ve AI ikizini birlikte kuralım")}</p>
        </div>
        <div className="ms-auto w-24 shrink-0 text-end sm:w-32" aria-label={t("{done}/{total} soru yanıtlandı", { done: view.answered.length, total })}>
          <p className="text-[11px] font-black text-brand-500" aria-hidden>{`${view.answered.length}/${total}`}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden>
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500" style={{ width: `${(view.answered.length / total) * 100}%` }} />
          </div>
        </div>
      </header>

      {blocked ? (
        <div className="flex-1 space-y-3 overflow-y-auto py-5">
          {transcript}
          <BotBubble tone="danger">
            <p className="flex items-center gap-1.5 font-extrabold">
              <ShieldAlert className="size-4" aria-hidden /> {t("Üzgünüz,")} {t("henüz olmaz.")}
            </p>
            <p className="mt-1">{t("HEYFANS yalnızca 18 yaşını doldurmuş kişiler içindir. Bu nedenle hesabın askıya alındı ve oturumun kapatıldı.")}</p>
            <p className="mt-2 flex gap-4 text-[13px] font-extrabold">
              <Link href="/help" className="text-brand-600 hover:underline">
                {t("Yardım Merkezi")}
              </Link>
              <Link href="/" className="text-muted-strong hover:underline">
                {t("Ana sayfaya dön")}
              </Link>
            </p>
          </BotBubble>
        </div>
      ) : (
        <Turn
          key={`${step}:${editing ? "edit" : "new"}`}
          {...props}
          step={step}
          view={view}
          editing={editing !== null}
          transcript={transcript}
          onView={(v) => {
            setView(v);
            setEditing(null);
          }}
          onCancelEdit={() => setEditing(null)}
          onBlocked={() => setBlocked(true)}
        />
      )}
    </div>
  );
}

/**
 * Tek soru turu: "yazıyor…" göstergesi → soru balonları → alt akış mesajları → yanıt alanı.
 * Soru değişince `key` ile yeniden kurulur; alt akış mesajları ve hata kendiliğinden sıfırlanır.
 */
function Turn({
  step,
  view,
  editing,
  transcript,
  categories,
  personaConsentText,
  knowledgeConsentText,
  todayIso,
  onView,
  onCancelEdit,
  onBlocked,
}: AssistantProps & {
  step: Step;
  view: CreatorAssistantView;
  editing: boolean;
  transcript: React.ReactNode;
  onView: (view: CreatorAssistantView) => void;
  onCancelEdit: () => void;
  onBlocked: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [typing, setTyping] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [local, setLocal] = React.useState<{ id: number; from: "bot" | "me"; content: React.ReactNode }[]>([]);
  const nextId = React.useRef(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setTyping(false), 550);
    return () => clearTimeout(timer);
  }, []);
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  React.useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [local.length, typing, error]);

  const say: Say = React.useCallback((from, content) => setLocal((l) => [...l, { id: ++nextId.current, from, content }]), []);

  /** Sunucu hatası: alan hatası varsa ilki (daha açıklayıcı), yoksa genel ileti. */
  const failWith = (r: { error: string; fieldErrors?: Record<string, string[]> }) => setError(Object.values(r.fieldErrors ?? {})[0]?.[0] ?? r.error);

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch {
      setError(t(NETWORK_ERROR));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onAnswer(payload: unknown) {
    const r = await run(() => answerCreatorAssistantAction(step, payload));
    if (!r) return false;
    if (!r.ok) {
      failWith(r);
      return false;
    }
    onView(r.data);
    return true;
  }

  async function sendBirthDate(birthDate: string) {
    await run(async () => {
      const r = await submitBirthDateAction({ birthDate, declared: true });
      if (!r.ok) return failWith(r);
      if (!r.data.over18) {
        await authClient.signOut().catch(() => undefined);
        return onBlocked();
      }
      const v = await refreshCreatorAssistantAction();
      if (!v.ok) return failWith(v);
      onView(v.data);
    });
  }

  async function submit() {
    await run(async () => {
      const r = await submitCreatorAssistantAction();
      if (!r.ok) return failWith(r);
      toast.success(r.message ?? t("Başvurun incelemeye gönderildi."));
      router.refresh();
    });
  }

  const draft = greetingDraft(view, t);
  const base: ComposerProps = { view, busy, onAnswer, say, fail: setError };
  let bubbles: React.ReactNode[];
  let composer: React.ReactNode;
  switch (step) {
    case "birthDate":
      bubbles = [t(QUESTIONS.birthDate)];
      composer = <BirthDateComposer todayIso={todayIso} busy={busy} onSend={sendBirthDate} />;
      break;
    case "displayName":
      bubbles = [t(QUESTIONS.displayName)];
      composer = <TextComposer initial={view.values.displayName} label={t("Görünen ad")} placeholder={t("Örn. Melis Ertürk")} maxLength={80} minLength={2} autoComplete="name" busy={busy} onSend={(displayName) => void onAnswer({ displayName })} />;
      break;
    case "username":
      bubbles = [t(QUESTIONS.username)];
      composer = <UsernameComposer {...base} />;
      break;
    case "avatar":
    case "cover":
      bubbles = [t(QUESTIONS[step])];
      composer = <PhotoComposer {...base} purpose={step} />;
      break;
    case "categories":
      bubbles = [t(QUESTIONS.categories), t("En fazla 5 kategori seç. Keşfet sayfasında bu kategorilerde listelenirsin.")];
      composer = <CategoriesComposer {...base} categories={categories} />;
      break;
    case "socials":
      bubbles = [t(QUESTIONS.socials), t("Hesaplarını tek tek ekleyelim. İnceleme ekibimiz hesap sahipliğini doğrular.")];
      composer = <SocialsComposer {...base} />;
      break;
    case "bio":
      bubbles = [t(QUESTIONS.bio)];
      composer = <BioComposer {...base} />;
      break;
    case "location":
      bubbles = [t(QUESTIONS.location)];
      composer = <LocationComposer {...base} />;
      break;
    case "tone":
      bubbles = [t(QUESTIONS.tone)];
      composer = <ToneComposer {...base} />;
      break;
    case "greeting":
      bubbles = [t(QUESTIONS.greeting), <Quote key="q">{draft}</Quote>];
      composer = <GreetingComposer {...base} draft={draft} />;
      break;
    case "topics":
      bubbles = [t(QUESTIONS.topics), t("İkizin bu konular açıldığında kibarca konuyu değiştirir. Yoksa geçebilirsin.")];
      composer = <TopicsComposer {...base} />;
      break;
    case "contact":
      bubbles = [t(QUESTIONS.contact)];
      composer = <ContactComposer {...base} />;
      break;
    case "legalName":
      bubbles = [t(QUESTIONS.legalName)];
      composer = <TextComposer initial={view.values.legalName} label={t("Yasal ad soyad")} placeholder={t("Kimliğindeki gibi")} maxLength={120} minLength={3} busy={busy} onSend={(legalName) => void onAnswer({ legalName })} />;
      break;
    case "consents":
      bubbles = [t(QUESTIONS.consents), <Quote key="q">{personaConsentText}</Quote>];
      composer = <ConsentsComposer {...base} knowledgeText={knowledgeConsentText} />;
      break;
    case "review":
      bubbles = [
        t("Harika, her şey hazır! İşte profilinin ön izlemesi:"),
        <ProfilePreview key="p" view={view} categories={categories} />,
        <div key="c">
          <p className="font-extrabold">{t("Sahiplik doğrulaması")}</p>
          <p className="mt-1">
            {t("Ekibimiz hesap sahipliğini doğrular. Şu kodu ana platformundaki biyografine ekle ve inceleme bitene kadar kaldırma:")}{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-extrabold text-brand-600">{view.socialCode}</code>
          </p>
        </div>,
        t("Bir yanıtı değiştirmek istersen yanındaki kalem simgesine dokun. Hazırsan başvurunu gönder; ekibimiz profilini, kimlik talebini ve AI ikizini inceler, sonucu bildirim ve e-posta ile iletir."),
      ];
      composer = (
        <Button type="button" size="lg" loading={busy} onClick={() => void submit()} className="h-[54px] w-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-[15px]">
          <Send className="rtl:-scale-x-100" aria-hidden /> {t("Başvuruyu Gönder")}
        </Button>
      );
      break;
  }

  return (
    <>
      <div ref={scrollRef} role="log" aria-label={t("Asistanla sohbet")} className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1 py-5">
        {transcript}
        {typing ? (
          <TypingBubble />
        ) : (
          <>
            {bubbles.map((b, i) => (
              <BotBubble key={i} wide={step === "review" && i === 1}>
                {b}
              </BotBubble>
            ))}
            {local.map((b) => (b.from === "bot" ? <BotBubble key={b.id}>{b.content}</BotBubble> : <MeBubble key={b.id}>{b.content}</MeBubble>))}
          </>
        )}
      </div>
      <footer className="border-t border-line pt-3">
        {error && (
          <p role="alert" className="mb-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        {!typing && composer}
        {editing && (
          <button type="button" onClick={onCancelEdit} disabled={busy} className="mt-2 px-2 text-xs font-extrabold text-muted-strong hover:text-brand-600">
            {t("Değiştirmekten vazgeç")}
          </button>
        )}
      </footer>
    </>
  );
}

/* ─── Balonlar ──────────────────────────────────────────── */
function AssistantAvatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white", size === "lg" ? "size-11" : "size-7")} aria-hidden>
      <Sparkles className={size === "lg" ? "size-5" : "size-3.5"} />
    </span>
  );
}

function BotBubble({ children, tone, wide }: { children: React.ReactNode; tone?: "warn" | "danger"; wide?: boolean }) {
  return (
    <div className="flex animate-fade-up items-end gap-2">
      <AssistantAvatar />
      <div
        className={cn(
          "rounded-2xl rounded-es-md px-4 py-2.5 text-[14px] leading-relaxed",
          wide ? "w-full max-w-[420px] p-0" : "max-w-[85%]",
          tone === "warn" ? "bg-warning-soft text-ink" : tone === "danger" ? "bg-danger-soft text-ink" : wide ? "bg-transparent" : "bg-soft text-ink",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function MeBubble({ children, onEdit, editing, bare }: { children: React.ReactNode; onEdit?: () => void; editing?: boolean; bare?: boolean }) {
  const t = useT();
  return (
    <div className="flex animate-fade-up items-center justify-end gap-1.5">
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={t("Bu yanıtı değiştir")} className={cn("grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-soft hover:text-brand-600", editing ? "text-brand-500" : "text-muted")}>
          <Pencil className="size-3.5" aria-hidden />
        </button>
      )}
      <div className={cn("max-w-[80%] break-words text-[14px] leading-relaxed", bare ? "" : "rounded-2xl rounded-ee-md bg-brand-500 px-4 py-2.5 text-white", editing && "opacity-60")}>{children}</div>
    </div>
  );
}

function TypingBubble() {
  const t = useT();
  return (
    <div className="flex items-end gap-2" role="status" aria-label={t("Asistan yazıyor…")}>
      <AssistantAvatar />
      <div className="flex gap-1 rounded-2xl rounded-es-md bg-soft px-4 py-3.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-pulse-soft rounded-full bg-muted" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return <p className="whitespace-pre-line rounded-xl border-s-4 border-brand-400 bg-white/80 px-3 py-2 text-[13px] text-ink-soft">{children}</p>;
}

/* ─── Yanıt özetleri ────────────────────────────────────── */
function TagList({ items, light }: { items: string[]; light?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", light ? "bg-white/20" : "bg-brand-50 text-brand-700")}>
          {x}
        </span>
      ))}
    </span>
  );
}

function AnswerSummary({ step, view, categories }: { step: AssistantStep; view: CreatorAssistantView; categories: CreatorCategory[] }) {
  const t = useT();
  const v = view.values;
  switch (step) {
    case "birthDate":
      return <>{t("18 yaşını doldurduğumu beyan ettim.")}</>;
    case "displayName":
      return <>{v.displayName}</>;
    case "username":
      return <span dir="ltr">{`@${v.username}`}</span>;
    case "avatar":
      // eslint-disable-next-line @next/next/no-img-element
      return v.avatarUrl ? <img src={v.avatarUrl} alt={t("Profil fotoğrafın")} className="size-24 rounded-full object-cover ring-4 ring-brand-100" /> : <>{t("Fotoğraf yüklenmedi.")}</>;
    case "cover":
      // eslint-disable-next-line @next/next/no-img-element
      return v.coverUrl ? <img src={v.coverUrl} alt={t("Kapak görselin")} className="h-24 w-64 max-w-full rounded-2xl object-cover" /> : <>{t("Şimdilik kapak görseli eklemiyorum.")}</>;
    case "categories":
      return <TagList light items={v.categories.map((slug) => categories.find((c) => c.slug === slug)?.name ?? slug)} />;
    case "socials":
      return (
        <span className="flex flex-col gap-1">
          {v.links.map((l) => (
            <LinkSummary key={l.platform} link={l} />
          ))}
        </span>
      );
    case "bio":
      return (
        <>
          <span className="block whitespace-pre-line">{v.bio}</span>
          {v.headline && <span className="mt-1.5 block text-xs font-bold opacity-85">{t("Kısa tanıtım: {headline}", { headline: v.headline })}</span>}
        </>
      );
    case "location":
      return <>{v.location || t("Şimdilik geçiyorum.")}</>;
    case "tone": {
      const emoji = EMOJI_OPTIONS.find((o) => o.value === v.emoji)?.label ?? EMOJI_OPTIONS[1].label;
      return <>{v.tone ? t("{tone} · Emoji: {emoji}", { tone: t(TONE_PRESETS[v.tone].label), emoji: t(emoji) }) : t("Kendi kişilik ayarlarımı kullanıyorum.")}</>;
    }
    case "greeting":
      return <span className="whitespace-pre-line">{v.greeting}</span>;
    case "topics":
      return v.blockedTopics.length ? <TagList light items={v.blockedTopics} /> : <>{t("Kısıtlamak istediğim bir konu yok.")}</>;
    case "contact": {
      const pref = CONTACT_PREFERENCES.find((p) => p.key === v.contact.preference)?.label;
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1.5">
          <span dir="ltr">{v.contact.masked ?? ""}</span>
          {pref && <span className="opacity-85">{`· ${t(pref)}`}</span>}
        </span>
      );
    }
    case "legalName":
      return <>{v.legalName}</>;
    case "consents":
      return (
        <>
          <span className="block">{t("AI ikizim için açık rıza verdim.")}</span>
          {v.knowledgeConsent && <span className="mt-1 block text-xs opacity-85">{t("Bilgi kaynaklarımın kullanılmasına da izin verdim.")}</span>}
        </>
      );
  }
}

/** Başvuru öncesi profil ön izlemesi (hayranların göreceği kart + AI ikizi). */
function ProfilePreview({ view, categories }: { view: CreatorAssistantView; categories: CreatorCategory[] }) {
  const t = useT();
  const v = view.values;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-[0_16px_40px_-28px_rgba(25,16,34,0.45)]">
      <div className="relative h-24 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {v.coverUrl && <img src={v.coverUrl} alt="" className="size-full object-cover" />}
      </div>
      <div className="px-4 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {v.avatarUrl && <img src={v.avatarUrl} alt="" className="-mt-9 size-[72px] rounded-full object-cover ring-4 ring-white" />}
        <p className="mt-2 font-display text-[18px] font-extrabold leading-tight tracking-[-0.02em]">{v.displayName}</p>
        <p className="text-xs font-bold text-muted-strong" dir="ltr">{`@${v.username}`}</p>
        {v.headline && <p className="mt-2 text-[13px] text-ink-soft">{v.headline}</p>}
        {v.location && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-strong">
            <MapPin className="size-3.5" aria-hidden /> {v.location}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {v.categories.map((slug) => {
            const c = categories.find((x) => x.slug === slug);
            return (
              <span key={slug} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-extrabold text-brand-700">
                <CategoryIcon name={c?.icon ?? ""} className="size-3" />
                {c?.name ?? slug}
              </span>
            );
          })}
        </div>
        <ul className="mt-3 space-y-1 text-xs text-ink-soft">
          {v.links.map((l) => (
            <li key={l.platform}>
              <LinkSummary link={l} />
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl bg-soft p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-brand-500">
            <Sparkles className="size-3.5" aria-hidden /> {t("AI ikizi")}
            {v.tone && <span className="font-bold normal-case tracking-normal text-muted-strong">{`· ${t(TONE_PRESETS[v.tone].label)}`}</span>}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-soft">{`“${v.greeting}”`}</p>
        </div>
      </div>
    </div>
  );
}
