import "server-only";
import { createHash } from "node:crypto";
import { allowsMockProviders, env } from "@/config/env";
import { FeatureUnavailableError } from "@/lib/errors";
import { getT } from "@/i18n/server";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface StreamResult {
  stream: AsyncIterable<string>;
  /** Akış bittikten sonra çözülür. */
  usage: Promise<Usage>;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  readonly embeddingModel: string;
  readonly isMock: boolean;
  chatStream(messages: ChatMessage[], opts: { maxTokens: number; temperature: number; signal?: AbortSignal }): Promise<StreamResult>;
  chat(messages: ChatMessage[], opts: { maxTokens: number; temperature: number; signal?: AbortSignal }): Promise<{ text: string; usage: Usage }>;
  embed(texts: string[]): Promise<{ vectors: number[][]; usage: Usage }>;
}

/** Yaklaşık token sayısı (sağlayıcı kullanım verisi dönmediğinde). */
export const approxTokens = (text: string) => Math.ceil(text.length / 3.6);

/* ─── OpenAI uyumlu sağlayıcı (OpenAI, Gemini OpenAI-uyumlu uç, OpenRouter, Ollama, LM Studio) ─── */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai-compatible";
  readonly isMock = false;
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly model: string,
    readonly embeddingModel: string,
  ) {}

  private headers() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` }; // i18n-ignore (HTTP başlığı)
  }

  async chat(messages: ChatMessage[], opts: { maxTokens: number; temperature: number; signal?: AbortSignal }) {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, messages, max_tokens: opts.maxTokens, temperature: opts.temperature }),
      signal: opts.signal,
    });
    if (!res.ok) throw new Error(`AI sağlayıcısı hata döndürdü (${res.status})`); // i18n-ignore (günlük/geliştirici hatası)
    const json = (await res.json()) as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
    const text = json.choices?.[0]?.message?.content ?? "";
    return {
      text,
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? approxTokens(messages.map((m) => m.content).join("\n")),
        outputTokens: json.usage?.completion_tokens ?? approxTokens(text),
      },
    };
  }

  async chatStream(messages: ChatMessage[], opts: { maxTokens: number; temperature: number; signal?: AbortSignal }): Promise<StreamResult> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, messages, max_tokens: opts.maxTokens, temperature: opts.temperature, stream: true, stream_options: { include_usage: true } }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) throw new Error(`AI sağlayıcısı hata döndürdü (${res.status})`); // i18n-ignore (günlük/geliştirici hatası)
    let resolveUsage!: (u: Usage) => void;
    const usage = new Promise<Usage>((r) => (resolveUsage = r));
    const inputApprox = approxTokens(messages.map((m) => m.content).join("\n"));
    const body = res.body;
    async function* iterate() {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let out = "";
      let reported: Usage | null = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                out += delta;
                yield delta;
              }
              if (json.usage) reported = { inputTokens: json.usage.prompt_tokens, outputTokens: json.usage.completion_tokens };
            } catch {
              /* yarım satır — yoksay */
            }
          }
        }
      } finally {
        resolveUsage(reported ?? { inputTokens: inputApprox, outputTokens: approxTokens(out) });
      }
    }
    return { stream: iterate(), usage };
  }

  async embed(texts: string[]) {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.embeddingModel, input: texts }),
    });
    if (!res.ok) throw new Error(`Gömme (embedding) isteği başarısız (${res.status})`); // i18n-ignore (günlük/geliştirici hatası)
    const json = (await res.json()) as { data: { embedding: number[] }[]; usage?: { prompt_tokens: number } };
    return { vectors: json.data.map((d) => d.embedding), usage: { inputTokens: json.usage?.prompt_tokens ?? approxTokens(texts.join(" ")), outputTokens: 0 } };
  }
}

/* ─── Mock sağlayıcı (yalnız geliştirme/test) ─────────────────────────────────
 * Deterministik, ağsız. Yanıtlar arayüzde "Test yanıtı" olarak işaretlenir; üretimde yüklenemez.
 */
export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  readonly model = "mock-twin-1";
  readonly embeddingModel = "mock-embed-64";
  readonly isMock = true;

  /** Test yanıtı isteğin dilinde üretilir (istek dışında Türkçe). */
  private async reply(messages: ChatMessage[]) {
    const t = await getT();
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const name = /AI_IKIZ_ADI:\s*(.+)/.exec(system)?.[1]?.trim() ?? t("AI ikizi");
    const topic = lastUser.replace(/\s+/g, " ").slice(0, 80);
    return t("[Test yanıtı] Merhaba! Ben {name}'in AI ikiziyim. \"{topic}\" hakkında konuşmayı çok isterim. Bu yanıt, gerçek bir AI sağlayıcısı yapılandırılmadığı için test modunda üretildi.", { name, topic });
  }

  async chat(messages: ChatMessage[]) {
    const text = await this.reply(messages);
    return { text, usage: { inputTokens: approxTokens(messages.map((m) => m.content).join("\n")), outputTokens: approxTokens(text) } };
  }

  async chatStream(messages: ChatMessage[]): Promise<StreamResult> {
    const text = await this.reply(messages);
    const words = text.split(/(\s+)/);
    async function* iterate() {
      for (const w of words) {
        await new Promise((r) => setTimeout(r, 12));
        yield w;
      }
    }
    return { stream: iterate(), usage: Promise.resolve({ inputTokens: approxTokens(messages.map((m) => m.content).join("\n")), outputTokens: approxTokens(text) }) };
  }

  /** Karma tabanlı deterministik 64 boyutlu vektör (yalnız test/geliştirme). */
  async embed(texts: string[]) {
    const vectors = texts.map((t) => {
      const v = new Array<number>(64).fill(0);
      for (const token of t.toLocaleLowerCase("tr-TR").split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
        const h = createHash("sha1").update(token).digest();
        for (let i = 0; i < 4; i++) v[h[i]! % 64]! += h[i + 4]! % 2 === 0 ? 1 : -1;
      }
      const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
      return v.map((x) => x / norm);
    });
    return { vectors, usage: { inputTokens: approxTokens(texts.join(" ")), outputTokens: 0 } };
  }
}

export function aiStatus() {
  const e = env();
  if (e.AI_PROVIDER === "openai-compatible" && e.AI_API_KEY && e.AI_BASE_URL && e.AI_MODEL) return { available: true, mock: false, provider: e.AI_PROVIDER, model: e.AI_MODEL };
  if (e.AI_PROVIDER === "mock" && allowsMockProviders()) return { available: true, mock: true, provider: "mock", model: "mock-twin-1" };
  return { available: false, mock: false, provider: e.AI_PROVIDER, model: null };
}

export function getAiProvider(): AiProvider {
  const e = env();
  if (e.AI_PROVIDER === "openai-compatible") {
    if (!e.AI_API_KEY || !e.AI_BASE_URL || !e.AI_MODEL) throw new FeatureUnavailableError("AI sağlayıcısı eksik yapılandırılmış.", ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL"]);
    return new OpenAiCompatibleProvider(e.AI_BASE_URL, e.AI_API_KEY, e.AI_MODEL, e.AI_EMBEDDING_MODEL ?? "text-embedding-3-small");
  }
  if (e.AI_PROVIDER === "mock") {
    if (!allowsMockProviders()) throw new FeatureUnavailableError("Test AI sağlayıcısı üretimde kullanılamaz.");
    return new MockAiProvider();
  }
  throw new FeatureUnavailableError("AI sohbeti şu anda kullanılamıyor: AI sağlayıcısı yapılandırılmadı.", ["AI_PROVIDER", "AI_API_KEY", "AI_BASE_URL", "AI_MODEL"]);
}

/** Mikro-USD cinsinden maliyet (env'deki model fiyatlarına göre). */
export function costMicroUsd(usage: Usage) {
  const e = env();
  return Math.round(usage.inputTokens * e.AI_PRICE_INPUT_PER_MTOK + usage.outputTokens * e.AI_PRICE_OUTPUT_PER_MTOK);
}
