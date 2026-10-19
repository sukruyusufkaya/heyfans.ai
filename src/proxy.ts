import { NextResponse, type NextRequest } from "next/server";

/**
 * İyimser yönlendirme: oturum çerezi yoksa korumalı alanlardan girişe yönlendirir.
 * Bu bir güvenlik sınırı DEĞİLDİR — gerçek yetki kontrolü layout'larda ve servis katmanında yapılır.
 */
const PROTECTED_PREFIXES = ["/app", "/chat", "/experiences", "/checkout", "/studio", "/admin", "/onboarding", "/content/"];
const SESSION_COOKIES = ["hf.session_token", "__Secure-hf.session_token"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p.endsWith("/") ? p : `${p}/`) || pathname === p) ||
    /^\/creators\/[^/]+\/(content|membership)$/.test(pathname);
  if (!needsAuth) return NextResponse.next();
  const hasSession = SESSION_COOKIES.some((c) => request.cookies.has(c));
  if (hasSession) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml|media|brand).*)"],
};
