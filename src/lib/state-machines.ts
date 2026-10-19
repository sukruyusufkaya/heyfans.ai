import { ConflictError } from "@/lib/errors";
import type { CustomRequestStatus } from "@/models/monetization";
import type { TwinStatus } from "@/models/ai";
import type { ContentStatus } from "@/models/content";

/** Saf durum makineleri — servisler geçişleri yalnız bu tablolar üzerinden yapar (birim testli). */
export type TransitionTable<S extends string> = Record<S, readonly S[]>;

export function canTransition<S extends string>(table: TransitionTable<S>, from: S, to: S) {
  return table[from]?.includes(to) ?? false;
}

export function assertTransition<S extends string>(table: TransitionTable<S>, from: S, to: S, labels?: Partial<Record<S, string>>) {
  if (!canTransition(table, from, to)) {
    throw new ConflictError(`Geçersiz durum geçişi: ${labels?.[from] ?? from} → ${labels?.[to] ?? to}`, "invalid_transition");
  }
}

export const TWIN_TRANSITIONS: TransitionTable<TwinStatus> = {
  draft: ["pending_review", "revoked"],
  pending_review: ["approved", "rejected", "draft", "revoked"],
  approved: ["live", "draft", "revoked"],
  live: ["paused", "pending_review", "revoked"],
  paused: ["live", "pending_review", "revoked"],
  rejected: ["draft", "pending_review", "revoked"],
  revoked: ["draft"],
};

export const TWIN_STATUS_LABELS: Record<TwinStatus, string> = {
  draft: "Taslak",
  pending_review: "İncelemede",
  approved: "Onaylandı",
  live: "Yayında",
  paused: "Duraklatıldı",
  rejected: "Reddedildi",
  revoked: "Geri çekildi",
};

export const CUSTOM_REQUEST_TRANSITIONS: TransitionTable<CustomRequestStatus> = {
  draft: ["pending", "canceled"],
  pending: ["in_review", "approved", "rejected", "canceled"],
  in_review: ["approved", "rejected"],
  approved: ["processing", "canceled"],
  processing: ["completed"],
  completed: [],
  rejected: [],
  canceled: [],
};

export const CUSTOM_REQUEST_LABELS: Record<CustomRequestStatus, string> = {
  draft: "Taslak",
  pending: "Beklemede",
  in_review: "İncelemede",
  approved: "Onaylandı",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
  canceled: "İptal Edildi",
};

export const CONTENT_TRANSITIONS: TransitionTable<ContentStatus> = {
  draft: ["in_review", "published", "removed"],
  in_review: ["published", "draft", "removed"],
  published: ["hidden", "removed", "draft"],
  hidden: ["published", "removed", "draft"],
  removed: [],
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Taslak",
  in_review: "İncelemede",
  published: "Yayında",
  hidden: "Gizli",
  removed: "Kaldırıldı",
};
