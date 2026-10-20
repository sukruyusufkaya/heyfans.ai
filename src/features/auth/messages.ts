/**
 * Better Auth hata kodlarının Türkçe karşılıkları (sunucu + istemci ortak, bağımlılıksız).
 * `authErrorMessage` (lib/auth/client) ortak kodları karşılar; burası ek kodları ve bağlantı hatalarını kapsar.
 */
export const EXTRA_AUTH_MESSAGES: Record<string, string> = {
  INVALID_TWO_FACTOR_COOKIE: "İkinci adım oturumun süresi doldu. Lütfen yeniden giriş yap.",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Çok fazla hatalı deneme. Yeniden giriş yaparak yeni bir oturum başlat.",
  ACCOUNT_TEMPORARILY_LOCKED: "Hesap geçici olarak kilitlendi. Biraz sonra tekrar dene.",
  INVALID_BACKUP_CODE: "Yedek kod hatalı veya daha önce kullanılmış.",
  TOTP_NOT_ENABLED: "Bu hesapta kimlik doğrulama uygulaması etkin değil.",
  TOTP_ALREADY_ENABLED: "Kimlik doğrulama uygulaması zaten etkin.",
  TWO_FACTOR_NOT_ENABLED: "İki adımlı doğrulama bu hesapta etkin değil.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Bu hesap şifreyle oluşturulmadı; şifre gerektiren işlem yapılamıyor.",
  USER_NOT_FOUND: "Hesap bulunamadı.",
  INVALID_USER: "Bu bağlantı farklı bir hesap için oluşturulmuş.",
  VERIFICATION_EMAIL_NOT_ENABLED: "E-posta doğrulama şu anda kullanılamıyor.",
  EMAIL_ALREADY_VERIFIED: "E-posta adresin zaten doğrulanmış. Giriş yapabilirsin.",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Bu sosyal hesap zaten bağlı.",
  PROVIDER_NOT_FOUND: "Bu sağlayıcıyla giriş şu anda yapılandırılmamış.",
  FAILED_TO_CREATE_SESSION: "Hesabın şu anda oturum açamıyor. Askıya alınmış olabilir; destek ile iletişime geç.",
  EMAIL_NOT_VERIFIED: "E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.",
};

/** `/verify?error=` ve `/reset-password?error=` için küçük harfli / büyük harfli kodlar. */
export function linkErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  const key = code.toUpperCase();
  const map: Record<string, string> = {
    TOKEN_EXPIRED: "Doğrulama bağlantısının süresi dolmuş. Aşağıdan yeni bir bağlantı isteyebilirsin.",
    INVALID_TOKEN: "Bağlantı geçersiz veya daha önce kullanılmış. Aşağıdan yeni bir bağlantı isteyebilirsin.",
    USER_NOT_FOUND: "Bu bağlantıya ait hesap bulunamadı.",
    INVALID_USER: "Bu bağlantı farklı bir hesap için oluşturulmuş. Doğru hesapla oturum açıp tekrar dene.",
    ACCESS_DENIED: "Giriş izni verilmedi. Tekrar deneyebilirsin.",
  };
  return map[key] ?? EXTRA_AUTH_MESSAGES[key] ?? "Bağlantı doğrulanamadı. Aşağıdan yeni bir bağlantı isteyebilirsin.";
}

/** Google / Apple dönüşünde `/login?social=1&error=` ile gelen kodlar (Better Auth + sağlayıcı kodları). */
export function socialErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  const key = code.toUpperCase().replace(/[\s']/g, "_");
  const map: Record<string, string> = {
    ACCESS_DENIED: "Giriş izni verilmedi. İstersen tekrar deneyebilirsin.",
    USER_CANCELLED_AUTHORIZE: "Apple ile giriş iptal edildi. İstersen tekrar deneyebilirsin.",
    STATE_NOT_FOUND: "Giriş oturumunun süresi doldu. Lütfen yeniden dene.",
    STATE_MISMATCH: "Giriş oturumunun süresi doldu. Lütfen yeniden dene.",
    PLEASE_RESTART_THE_PROCESS: "Giriş oturumunun süresi doldu. Lütfen yeniden dene.",
    INVALID_CODE: "Giriş tamamlanamadı. Lütfen yeniden dene.",
    NO_CODE: "Giriş tamamlanamadı. Lütfen yeniden dene.",
    EMAIL_NOT_FOUND: "Sağlayıcı e-posta adresini paylaşmadı. E-posta izni vererek tekrar dene ya da e-postanla kaydol.",
    ACCOUNT_NOT_LINKED: "Bu e-postayla kayıtlı bir hesap var. Önce e-posta ve şifrenle giriş yap.",
    UNABLE_TO_LINK_ACCOUNT: "Bu e-postayla kayıtlı bir hesap var. Önce e-posta ve şifrenle giriş yap.",
    SIGNUP_DISABLED: "Şu anda yeni kayıt alınmıyor.",
    UNABLE_TO_CREATE_SESSION: "Hesabın şu anda oturum açamıyor. Askıya alınmış olabilir; destek ile iletişime geç.",
    OAUTH_PROVIDER_NOT_FOUND: "Bu sağlayıcıyla giriş şu anda yapılandırılmamış.",
  };
  return map[key] ?? "Google/Apple ile giriş tamamlanamadı. Tekrar dene ya da e-posta ve şifrenle giriş yap.";
}
