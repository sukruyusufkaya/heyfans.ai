/** Studio istemci/sunucu bileşenlerinin paylaştığı etiket tabloları (server-only içermez). */
export const CONTENT_TYPE_LABELS: Record<string, string> = { photo: "Fotoğraf", video: "Video", audio: "Ses", text: "Metin", collection: "Koleksiyon" };
export const ACCESS_LABEL: Record<string, string> = { public: "Herkese açık", followers: "Takipçilere özel", subscribers: "Abonelere özel", purchase: "Tekil satın alma" };
export const TIER_LABEL: Record<string, string> = { free: "Ücretsiz", basic: "Temel", premium: "Premium", vip: "VIP" };
export const CONTENT_STATUS_TONE: Record<string, "green" | "warn" | "gray" | "violet" | "danger"> = { published: "green", draft: "warn", in_review: "violet", hidden: "gray", removed: "danger" };
