import "server-only";
import { headers } from "next/headers";
import { assertCreator } from "@/lib/auth/session";

/** Server Action girişi: oturum + creator rolü; kullanıcı kimliğini döndürür. */
export async function creatorUserId() {
  const { user } = await assertCreator();
  return user.id;
}

export async function clientIp() {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  } catch {
    return null;
  }
}
