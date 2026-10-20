/** Demo/geliştirme tohum verisi. Hepsi isDemo=true olarak yazılır; üretim metriği değildir. */
import { m } from "@/i18n/m";

export const CATEGORIES = [
  { slug: "yasam-tarzi", name: m("Yaşam Tarzı"), icon: "home", order: 1, description: m("Günlük yaşam, ev, yemek ve ilham veren rutinler."), heroTitle: m("Yaşam Tarzı"), heroText: m("Seyahat, moda, fitness, yemek, wellness ve daha fazlası… Yaşam tarzını paylaşan, ilham veren içerik üreticileri ve AI ikizleriyle tanış.") },
  { slug: "fitness", name: m("Fitness"), icon: "dumbbell", order: 2, description: m("Antrenman, beslenme ve motivasyon.") },
  { slug: "seyahat", name: m("Seyahat"), icon: "plane", order: 3, description: m("Rotalar, ipuçları ve keşif hikâyeleri.") },
  { slug: "oyun", name: m("Oyun"), icon: "gamepad-2", order: 4, description: m("Yayıncılar, e-spor ve oyun kültürü.") },
  { slug: "muzik", name: m("Müzik"), icon: "music", order: 5, description: m("Şarkıcılar, prodüktörler ve müzik sohbetleri.") },
  { slug: "egitim", name: m("Eğitim"), icon: "book-open", order: 6, description: m("Dil, kariyer ve kişisel gelişim.") },
  { slug: "moda", name: m("Moda"), icon: "shirt", order: 7, description: m("Stil, kombin ve trendler.") },
  { slug: "sanat", name: m("Sanat ve Yaratıcılık"), icon: "palette", order: 8, description: m("Resim, tasarım, fotoğraf ve el sanatları.") },
  { slug: "is-dunyasi", name: m("İş Dünyası"), icon: "briefcase", order: 9, description: m("Girişimcilik, kariyer ve finansal okuryazarlık.") },
  { slug: "wellness", name: m("Wellness"), icon: "flower-2", order: 10, description: m("Zihinsel sağlık, meditasyon ve denge.") },
  { slug: "yemek", name: m("Yemek"), icon: "chef-hat", order: 11, parentSlug: "yasam-tarzi", description: m("Tarifler ve mutfak sohbetleri.") },
  { slug: "ev-yasam", name: m("Ev & Yaşam"), icon: "sofa", order: 12, parentSlug: "yasam-tarzi", description: m("Dekorasyon ve düzen.") },
  { slug: "evcil-dostlar", name: m("Evcil Dostlar"), icon: "paw-print", order: 13, parentSlug: "yasam-tarzi", description: m("Evcil hayvan bakımı ve sevimli anlar.") },
];

export const PLATFORM_PLANS = [
  { tier: "free" as const, name: m("Ücretsiz"), description: m("HeyFans'ı keşfet, temel özellikleri dene."), priceMinor: 0, benefits: [m("Sınırlı içeriklere erişim"), m("Herkese açık gönderileri görme"), m("Sınırlı sayıda profil görüntüleme")], entitlements: { contentAccess: "none" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 0, customRequests: false, prioritySupport: false } },
  { tier: "basic" as const, name: m("Temel"), description: m("Daha fazla içerik, daha fazla eğlence."), priceMinor: 19_900, benefits: [m("Daha fazla içeriğe erişim"), m("İçerik üreticilerini takip etme"), m("Sınırsız profil görüntüleme"), m("Aylık 50 sohbet kredisi")], entitlements: { contentAccess: "basic" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 50, customRequests: false, prioritySupport: false } },
  { tier: "premium" as const, name: m("Premium"), description: m("Özel içeriklere eriş ve doğrudan sohbet et."), priceMinor: 39_900, isPopular: true, benefits: [m("Aylık 150 sohbet kredisi"), m("İçerik üreticileriyle sohbet etme"), m("Sınırsız profil görüntüleme"), m("Öncelikli destek")], entitlements: { contentAccess: "premium" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 150, customRequests: false, prioritySupport: true } },
  { tier: "vip" as const, name: m("VIP"), description: m("En özel deneyim, en yakın bağlantı."), priceMinor: 69_900, benefits: [m("Tüm Premium avantajları"), m("Aylık 400 sohbet kredisi"), m("Öncelikli sohbet ve yanıtlar"), m("Özel istek gönderme imkânı"), m("Erken erişim ve özel etkinlikler")], entitlements: { contentAccess: "vip" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 400, customRequests: true, prioritySupport: true } },
];

export const GIFTS = [
  { key: "gul", name: m("Gül"), icon: "flower", credits: 10, order: 1 },
  { key: "kalp", name: m("Kalp"), icon: "heart", credits: 25, order: 2 },
  { key: "kahve", name: m("Kahve"), icon: "coffee", credits: 50, order: 3 },
  { key: "tac", name: m("Taç"), icon: "crown", credits: 100, order: 4 },
  { key: "elmas", name: m("Elmas"), icon: "gem", credits: 250, order: 5 },
  { key: "roket", name: m("Roket"), icon: "rocket", credits: 500, order: 6 },
];

export const HELP_ARTICLES = [
  { slug: "ai-ikizi-nedir", category: "ai_twins", title: m("AI ikizi nedir ve nasıl çalışır?"), summary: m("AI ikizlerinin creator onayıyla nasıl oluşturulduğunu ve sınırlarını öğren."), body: m("AI ikizi, içerik üreticisinin açık izniyle oluşturulan ve onun onayladığı kişilik ayarları, bilgi kaynakları ve sınırlarla çalışan bir yapay zekâ asistanıdır. AI ikizi gerçek kişi değildir; tüm yanıtlar \"AI İkizi\" etiketiyle gösterilir. Creator ikizini istediği an duraklatabilir veya iznini geri çekebilir."), tags: ["ai", "ikiz", "yapay zeka"] },
  { slug: "hesap-olusturma", category: "account", title: m("Hesap nasıl oluşturulur?"), summary: m("E-posta veya Google/Apple hesabınla kayıt olma adımları."), body: m("Kayıt Ol sayfasında hayran veya içerik üreticisi yolculuğunu seç, adını, e-posta adresini ve güçlü bir şifre gir. E-posta adresine gelen doğrulama bağlantısına tıklayarak hesabını etkinleştir."), tags: ["kayıt", "hesap"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "e-posta-dogrulama", category: "account", title: m("Doğrulama e-postası gelmedi"), summary: m("Doğrulama bağlantısını yeniden isteme ve spam klasörü kontrolü."), body: m("Hesap Doğrulama sayfasından yeni bir bağlantı isteyebilirsin. E-postalar birkaç dakika gecikebilir; spam/gereksiz klasörünü kontrol etmeyi unutma."), tags: ["doğrulama", "e-posta"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "sifre-sifirlama", category: "account", title: m("Şifremi unuttum"), summary: m("Şifre sıfırlama bağlantısı ile yeni şifre belirleme."), body: m("Giriş sayfasındaki 'Şifreni mi unuttun?' bağlantısına tıkla, e-posta adresini gir. Gelen bağlantı 30 dakika geçerlidir."), tags: ["şifre"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "abonelik-iptali", category: "subscriptions", title: m("Aboneliğimi nasıl iptal ederim?"), summary: m("Abonelikler dönem sonunda sona erecek şekilde iptal edilir."), body: m("Aboneliklerim sayfasından ilgili aboneliği seçip 'İptal et'e tıkla. Erişimin mevcut dönem sonuna kadar devam eder; sonraki dönem ücretlendirilmez."), tags: ["abonelik", "iptal"] },
  { slug: "kredi-nasil-kullanilir", category: "payments", title: m("Sohbet kredileri nasıl kullanılır?"), summary: m("Kredilerin mesaj, görüşme ve hediyelerde kullanımı."), body: m("Krediler AI ikizi mesajları, sesli/görüntülü görüşme dakikaları, hediyeler ve bahşişler için kullanılır. Her harcama Cüzdanım sayfasındaki hareket geçmişinde görünür. AI yanıtı üretilemezse harcanan kredi otomatik iade edilir."), tags: ["kredi", "cüzdan"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "odeme-yontemleri", category: "payments", title: m("Hangi ödeme yöntemleri kabul ediliyor?"), summary: m("Kart bilgileri ödeme kuruluşunun güvenli sayfasında alınır."), body: m("Ödemeler lisanslı ödeme kuruluşu üzerinden alınır; kart bilgilerin HEYFANS sunucularında saklanmaz. Kabul edilen yöntemler ödeme sayfasında listelenir."), tags: ["ödeme", "kart"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "iade-politikasi", category: "payments", title: m("İade talebi nasıl oluşturulur?"), summary: m("Hatalı veya yetkisiz ödemeler için iade süreci."), body: m("İletişim formundan 'Ödemeler' kategorisini seçerek işlem numarasıyla birlikte talep oluştur. Talepler finans ekibi tarafından incelenir."), tags: ["iade"] },
  { slug: "icerik-silme", category: "safety", title: m("Verilerimi nasıl silerim?"), summary: m("Sohbet, AI hafızası ve hesap silme seçenekleri."), body: m("Sohbetleri sohbet ekranından, AI hafızasını Kişiselleştirme sayfasından silebilirsin. Hesap silme talebi Hesap Ayarları'ndan başlatılır; finansal kayıtlar yasal saklama süresi boyunca anonimleştirilerek tutulur."), tags: ["veri", "silme", "kvkk"] },
  { slug: "sikayet-bildirimi", category: "safety", title: m("Bir içeriği veya profili nasıl bildiririm?"), summary: m("Taklit, taciz veya uygunsuz içerik bildirimi."), body: m("İçerik, profil veya sohbet ekranındaki 'Bildir' seçeneğini kullan. Acil güvenlik durumları için Güven ve Güvenlik sayfasındaki acil bildirim formunu kullan."), tags: ["şikayet", "rapor"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "creator-basvurusu", category: "creators", title: m("İçerik üreticisi olarak nasıl başvururum?"), summary: m("Creator karşılama sihirbazı ve doğrulama adımları."), body: m("Kayıt olurken 'İçerik Üreticisiyim' seçeneğini seç ya da hesabından Creator Studio'ya geç. Kimlik ve sosyal hesap doğrulaması, AI ikizi rıza adımları ve inceleme sonrasında profilin yayına alınır."), tags: ["creator", "başvuru"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "ai-ikizi-izinleri", category: "creators", title: m("AI ikizimin izinlerini nasıl geri çekerim?"), summary: m("Ses/görünüm ve persona izinlerinin yönetimi."), body: m("Creator Studio > Ses ve Görünüm ve Sınırlar ve İzinler sayfalarından izinlerini istediğin an geri çekebilirsin. Geri çekilen izinle ilgili özellikler derhal durdurulur."), tags: ["izin", "rıza"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "odeme-alma", category: "creators", title: m("Kazançlarımı nasıl çekerim?"), summary: m("Hak ediş, bekleme süresi ve ödeme talebi."), body: m("Gelirler sayfasında kullanılabilir bakiyeni görürsün. Ödemeler sayfasından doğrulanmış IBAN hesabına ödeme talebi oluşturabilirsin. Hak edişler bekleme süresi sonunda kullanılabilir olur."), tags: ["ödeme", "kazanç"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "uygulama-sorunlari", category: "technical", title: m("Sayfa yüklenmiyor veya sohbet yanıt vermiyor"), summary: m("Temel sorun giderme adımları."), body: m("Tarayıcını güncelle, önbelleği temizle ve tekrar dene. AI ikizi geçici olarak yanıt veremezse kredin iade edilir. Sorun sürerse destek talebi oluştur."), tags: ["hata", "teknik"] },
  { slug: "yas-dogrulama", category: "safety", title: m("Yaş doğrulaması neden gerekli?"), summary: m("Belirli özellikler için yaş güvencesi."), body: m("HEYFANS 18 yaş ve üzeri kullanıcılar içindir. Bazı özellikler güçlü yaş doğrulaması gerektirebilir; doğrulama yetkili sağlayıcı aracılığıyla yapılır ve kimlik belgen HEYFANS'ta saklanmaz."), tags: ["yaş", "güvenlik"] }, // i18n-ignore (arama etiketleri Türkçe kalır)
  { slug: "bildirim-ayarlari", category: "account", title: m("Bildirim tercihlerimi nasıl değiştiririm?"), summary: m("E-posta ve uygulama içi bildirimler."), body: m("Hesap ve Ödeme Ayarları sayfasındaki bildirim bölümünden hangi bildirimleri almak istediğini seçebilirsin."), tags: ["bildirim"] },
];

const LEGAL_NOTE = m("Bu metin TASLAKTIR ve yayın öncesi hukuk uzmanı onayı gerektirir. Kesinleşmiş hukuki belge değildir.");

export const LEGAL_PAGES: { slug: string; title: string; summary: string; sections: { id?: string; heading: string; body: string }[] }[] = [
  {
    slug: "privacy",
    title: m("Gizlilik Politikası"),
    summary: m("Verilerin nasıl toplandığı, işlendiği ve haklarının nasıl kullanılacağı. ") + LEGAL_NOTE,
    sections: [
      { heading: m("Genel Bakış"), body: m("HEYFANS olarak kişisel verilerini 6698 sayılı KVKK ve uygulanabilir olduğu ölçüde GDPR ilkelerine uygun şekilde işlemeyi hedefliyoruz. Bu taslak; hangi verilerin, hangi amaçla ve hangi hukuki sebeple işlendiğini açıklar.") },
      { heading: m("İşlenen Veri Türleri"), body: m("Hesap ve iletişim bilgileri; kullanım ve cihaz bilgileri; ödeme işlem kayıtları (kart bilgileri ödeme kuruluşunda tutulur); sohbet kayıtları; AI hafızası (yalnız izin verirsen); creator doğrulama sonuçları (kimlik belgeleri saklanmaz).") },
      { heading: m("İşleme Amaçları"), body: m("Hizmetin sunulması, güvenlik ve dolandırıcılık önleme, ödeme ve hak ediş işlemleri, yasal yükümlülükler, izin verdiğin kişiselleştirme.") },
      { heading: m("AI ve Sohbet Verileri"), body: m("AI ikizi yanıtları üretmek için mesajların ve creator'ın onayladığı bilgi kaynaklarının ilgili bölümleri, yapılandırılan AI sağlayıcısına iletilir. Sağlayıcı ve aktarım koşulları yayın öncesi bu bölümde netleştirilecektir.") },
      { heading: m("Saklama ve Silme"), body: m("Sohbetlerini ve AI hafızanı istediğin an silebilirsin. Finansal kayıtlar yasal saklama süreleri boyunca tutulur.") },
      { heading: m("Kullanıcı Hakları"), body: m("Erişim, düzeltme, silme, işlemeye itiraz ve veri taşınabilirliği haklarını İletişim sayfasındaki 'Gizlilik' kategorisiyle kullanabilirsin.") },
      { heading: m("Başvuru ve İletişim"), body: m("Veri sorumlusu ve iletişim bilgileri şirket bilgileri kesinleştiğinde eklenecektir.") },
    ],
  },
  {
    slug: "terms",
    title: m("Kullanım Şartları"),
    summary: m("Platformu kullanmadan önce bilinmesi gereken temel kurallar ve karşılıklı sorumluluklar. ") + LEGAL_NOTE,
    sections: [
      { heading: m("Hesap ve Uygunluk"), body: m("HEYFANS 18 yaş ve üzeri kullanıcılar içindir. Hesap güvenliğinden sen sorumlusun.") },
      { heading: m("AI İkizleri"), body: m("AI ikizleri yapay zekâ tarafından üretilen yanıtlar verir ve gerçek creator değildir. AI çıktıları hatalı olabilir; tavsiye niteliği taşımaz.") },
      { heading: m("Ücretli Hizmetler"), body: m("Abonelikler, krediler ve tekil satın almalar ödeme sayfasında gösterilen koşullara tabidir. Abonelikler dönem sonunda iptal edilebilir.") },
      { heading: m("İçerik Hakları"), body: m("Creator içerikleri creator'a aittir; izinsiz kopyalanamaz veya dağıtılamaz.") },
      { heading: m("Yasaklı Davranışlar"), body: m("Taciz, taklit, reşit olmayanlarla ilgili her türlü uygunsuz içerik, platform dışı ödeme talepleri ve kötüye kullanım yasaktır.") },
      { heading: m("Değişiklikler"), body: m("Şartlarda yapılacak önemli değişiklikler önceden bildirilecektir.") },
      { id: "mesafeli-satis", heading: m("Mesafeli Satış ve Ön Bilgilendirme (Taslak)"), body: m("Satıcı bilgileri, hizmetin temel nitelikleri, toplam fiyat (vergiler dahil), ödeme ve ifa koşulları ile cayma hakkına ilişkin bilgiler ödeme sayfasında sipariş özetiyle birlikte gösterilir. Anında ifa edilen dijital içerik ve hizmetlerde cayma hakkının istisnası, 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında hukuk incelemesinden sonra kesinleştirilecektir.") },
    ],
  },
  {
    slug: "creator-agreement",
    title: m("Creator Sözleşmesi"),
    summary: m("AI ikizi yetkilendirmesi, içerik hakları ve gelir paylaşımı ilkeleri. ") + LEGAL_NOTE,
    sections: [
      { heading: m("Kimlik ve Hesap Sahipliği"), body: m("Creator, doğrulanmış kimliğiyle hesabın sahibidir ve başkası adına hesap açamaz.") },
      { heading: m("AI İkizi Yetkilendirmesi"), body: m("AI ikizi yalnız creator'ın açık rızası, onayladığı persona ve bilgi kaynaklarıyla çalışır. Rıza her an geri çekilebilir.") },
      { heading: m("Görsel ve Ses Benzerliği"), body: m("Ses/görünüm benzerliği özellikleri ayrı ve açık izin gerektirir; izin geri çekildiğinde derhal durdurulur.") },
      { heading: m("Gelir ve Hak Ediş"), body: m("Taslak model: net gelirin %70'i creator'a, %30'u platforma. 'Net' tanımı (ödeme kuruluşu ücreti, vergiler, iade ve ters ibraz) yayın öncesi kesinleştirilecektir.") },
      { heading: m("İçerik Kuralları"), body: m("Topluluk Kuralları ve yürürlükteki mevzuat geçerlidir.") },
      { heading: m("Fesih"), body: m("Taraflar sözleşmeyi bildirimle sona erdirebilir; tahakkuk etmiş hak edişler ödenir.") },
    ],
  },
  {
    slug: "community-guidelines",
    title: m("Topluluk Kuralları"),
    summary: m("Saygılı, güvenli ve gerçek bağlantılar için ortak kurallar. ") + LEGAL_NOTE,
    sections: [
      { heading: m("Desteklediğimiz Davranışlar"), body: m("Saygılı iletişim, güvenli paylaşım ve şeffaf AI deneyimi.") },
      { heading: m("İzin Verilmeyen Davranışlar"), body: m("Taciz ve tehdit, izinsiz kimlik benzetimi (taklit), istismar, nefret söylemi, spam ve dolandırıcılık.") },
      { heading: m("Reşit Olmayanların Korunması"), body: m("Reşit olmayanları içeren her türlü cinsel veya istismar niteliğindeki içerik sıfır tolerans ile kaldırılır ve yetkililere bildirilir.") },
      { heading: m("Bildirim Süreci"), body: m("Bildirim → değerlendirme → karar ve itiraz hakkı.") },
    ],
  },
  {
    slug: "copyright",
    title: m("Telif ve İçerik Kaldırma"),
    summary: m("Telif hakkı ihlali, izinsiz içerik ve AI ile kimliğe bürünme talepleri için başvuru. ") + LEGAL_NOTE,
    sections: [
      { heading: m("Başvuru"), body: m("Hak sahibi; içerik bağlantısı, hak sahipliğine dair açıklama ve iletişim bilgileriyle başvurur.") },
      { heading: m("Değerlendirme Süreci"), body: m("Başvuru ve belge → inceleme → gerekirse içeriğin geçici kaldırılması → karar ve itiraz.") },
      { heading: m("Kötüye Kullanım"), body: m("Gerçeğe aykırı başvurular hesabın kısıtlanmasına yol açabilir.") },
    ],
  },
  {
    slug: "cookies",
    title: m("Çerez Politikası"),
    summary: m("Çerez türleri, amaçları ve tercih yönetimi. ") + LEGAL_NOTE,
    sections: [
      { heading: m("Zorunlu Çerezler"), body: m("Oturum, güvenlik ve tercihlerin hatırlanması için gereklidir; devre dışı bırakılamaz.") },
      { heading: m("İşlevsel Çerezler"), body: m("Dil ve görünüm tercihleri gibi deneyimi iyileştiren çerezler. Yalnız izninle.") },
      { heading: m("Analitik Çerezler"), body: m("Platform performansını anlamamıza yardımcı olur. Yalnız izninle ve izin öncesi çalışmaz.") },
      { heading: m("Pazarlama Çerezleri"), body: m("Kampanya ölçümü için. Yalnız izninle.") },
      { heading: m("Tercih Yönetimi"), body: m("Tercihlerini bu sayfadan her zaman değiştirebilir veya rızanı geri çekebilirsin.") },
    ],
  },
  {
    slug: "trust-and-safety",
    title: m("Güven ve Güvenlik"),
    summary: m("Doğrulanmış creator'lar, açık rıza ve güvenli deneyimler. ") + LEGAL_NOTE,
    sections: [
      { heading: m("Doğrulanmış Creator"), body: m("Kimlik ve hesap sahipliği doğrulanmadan creator profili yayına alınmaz.") },
      { heading: m("Açık AI Bildirimi"), body: m("AI ikizi yanıtları her zaman 'AI İkizi' etiketiyle gösterilir.") },
      { heading: m("Creator Onayı ve İzin Yönetimi"), body: m("AI ikizi ve benzerlik özellikleri yalnız creator'ın açık izniyle çalışır ve geri çekilebilir.") },
      { heading: m("İçerik Moderasyonu"), body: m("Otomatik filtreler ve insan incelemesi birlikte çalışır.") },
      { heading: m("Şikâyet ve İtiraz"), body: m("Her karar için itiraz hakkı vardır.") },
    ],
  },
];
