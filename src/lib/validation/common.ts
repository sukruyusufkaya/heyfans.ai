import { Types } from "mongoose";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { m } from "@/i18n/m";

/** 24 karakter hex ObjectId — operatör enjeksiyonu (`{$ne: ...}`) bu şemadan geçemez. */
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, m("Geçersiz kimlik"));

export function oid(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new AppError("Geçersiz kimlik.", "invalid_id", 400);
  return new Types.ObjectId(id);
}

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, m("Kullanıcı adı 3-30 karakter olmalı; harf, rakam, _ ve . kullanılabilir"));

export const pageSchema = z.coerce.number().int().min(1).max(1000).default(1);
export const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(20);

export const searchTextSchema = z.string().trim().max(100).optional().default("");

/** Regex'e güvenle gömmek için özel karakterleri kaçırır. */
export function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const idempotencyKeySchema = z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9:_-]+$/);

export function paginate(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, limit: pageSize };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function paged<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
