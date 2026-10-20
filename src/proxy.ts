import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER, LOCALE_PARAM, LOCALE_SOURCE_HEADER, PATH_HEADER } from "@/i18n/config";
import { COUNTRY_HEADER, resolveLocale } from "@/i18n/resolve";

/**
 * 1) Dil: `?lang=` → çerez → konum (IP ülkesi) → tarayıcı dili; sonuç sunucu bileşenlerine başlıkla taşınır.
 *    `?lang=` açık seçim sayılır ve çereze yazılır; konum/tarayıcı tahmini yazılmaz (hesap dili ve seyahat durumunda konum belirleyici kalsın).
 * 2) İyimser yönlendirme: oturum çerezi yoksa korumalı alanlardan girişe yönlendirir.
 *    Bu bir güvenlik sınırı DEĞİLDİR — gerçek yetki kontrolü layout'larda ve servis katmanında yapılır.
 */
const PROTECTED_PREFIXES = ["/app", "/chat", "/experiences", "/checkout", "/studio", "/admin", "/onboarding", "/content/"];
const SESSION_COOKIES = ["hf.session_token", "__Secure-hf.session_token"];
const ONE_YEAR = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p.endsWith("/") ? p : `${p}/`) || pathname === p) ||
    /^\/creators\/[^/]+\/(content|membership)$/.test(pathname);
  const hasSession = SESSION_COOKIES.some((c) => request.cookies.has(c));
  if (needsAuth && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const { locale, source } = resolveLocale({
    param: searchParams.get(LOCALE_PARAM),
    cookie,
    country: request.headers.get(COUNTRY_HEADER),
    acceptLanguage: request.headers.get("accept-language"),
  });
  const forwarded = new Headers(request.headers);
  forwarded.set(LOCALE_HEADER, locale);
  forwarded.set(LOCALE_SOURCE_HEADER, source);
  forwarded.set(PATH_HEADER, pathname);
  const response = NextResponse.next({ request: { headers: forwarded } });
  if (source === "param" && cookie !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax", secure: request.nextUrl.protocol === "https:" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml|media|brand).*)"],
};
