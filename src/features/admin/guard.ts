import "server-only";
import { z } from "zod";
import { m } from "@/i18n/m";
import { assertAdmin } from "@/lib/auth/session";
import { ForbiddenError, type Permission } from "@/lib/permissions";
import { objectIdSchema } from "@/lib/validation/common";
import { actorOf } from "@/services/admin/shared";

/** Verilen izinlerden herhangi birine sahip yöneticiyi doğrular. */
export async function assertAdminAny(...perms: Permission[]) {
  for (const p of perms) {
    try {
      return await assertAdmin(p);
    } catch (e) {
      if (!(e instanceof ForbiddenError)) throw e;
    }
  }
  throw new ForbiddenError();
}

export { actorOf };

export const idSchema = objectIdSchema;
export const reasonSchema = z.string().trim().min(5, m("Gerekçe en az 5 karakter olmalı.")).max(1000, m("Gerekçe en çok 1000 karakter olabilir."));
