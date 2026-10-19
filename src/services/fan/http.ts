import "server-only";
import type { z } from "zod";
import { AppError } from "@/lib/errors";

/** JSON gövdesini Zod ile doğrular; geçersizse 400 (AppError) fırlatır — ham ZodError 500'e dönmesin. */
export async function parseJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("Geçersiz istek gövdesi.", "bad_request", 400);
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Geçersiz istek.", "bad_request", 400);
  return result.data;
}
