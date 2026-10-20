import { m } from "@/i18n/m";

/** Studio istemci/sunucu bileşenlerinin paylaştığı etiket tabloları (server-only içermez). */
export const CONTENT_TYPE_LABELS: Record<string, string> = { photo: m("Fotoğraf"), video: m("Video"), audio: m("Ses"), text: m("Metin"), collection: m("Koleksiyon") };
export const ACCESS_LABEL: Record<string, string> = { public: m("Herkese açık"), followers: m("Takipçilere özel"), subscribers: m("Abonelere özel"), purchase: m("Tekil satın alma") };
export const TIER_LABEL: Record<string, string> = { free: m("Ücretsiz"), basic: m("Temel"), premium: m("Premium"), vip: m("VIP") };
export const CONTENT_STATUS_TONE: Record<string, "green" | "warn" | "gray" | "violet" | "danger"> = { published: "green", draft: "warn", in_review: "violet", hidden: "gray", removed: "danger" };
