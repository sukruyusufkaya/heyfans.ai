import { AppError } from "@/lib/errors";
import { m } from "@/i18n/m";
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
    const params = { fromLabel: labels?.[from] ?? from, toLabel: labels?.[to] ?? to };
    throw new AppError("Geçersiz durum geçişi: {fromLabel} → {toLabel}", "invalid_transition", 409, { params });
  }
}

export const TWIN_TRANSITIONS: TransitionTable<TwinStatus> = {
  draft: ["pending_review", "revoked"],
  pending_review: ["approved", "rejected", "draft", "revoked"],
  approved: ["live", "pending_review", "draft", "revoked"],
  live: ["paused", "pending_review", "revoked"],
  paused: ["live", "pending_review", "revoked"],
  rejected: ["draft", "pending_review", "revoked"],
  revoked: ["draft"],
};

export const TWIN_STATUS_LABELS: Record<TwinStatus, string> = {
  draft: m("Taslak"),
  pending_review: m("İncelemede"),
  approved: m("Onaylandı"),
  live: m("Yayında"),
  paused: m("Duraklatıldı"),
  rejected: m("Reddedildi"),
  revoked: m("Geri çekildi"),
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
  draft: m("Taslak"),
  pending: m("Beklemede"),
  in_review: m("İncelemede"),
  approved: m("Onaylandı"),
  processing: m("İşleniyor"),
  completed: m("Tamamlandı"),
  rejected: m("Reddedildi"),
  canceled: m("İptal Edildi"),
};

export const CONTENT_TRANSITIONS: TransitionTable<ContentStatus> = {
  draft: ["in_review", "published", "removed"],
  in_review: ["published", "draft", "removed"],
  published: ["hidden", "removed", "draft"],
  hidden: ["published", "removed", "draft"],
  removed: [],
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: m("Taslak"),
  in_review: m("İncelemede"),
  published: m("Yayında"),
  hidden: m("Gizli"),
  removed: m("Kaldırıldı"),
};
