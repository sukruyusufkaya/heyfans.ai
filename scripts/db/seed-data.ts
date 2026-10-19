/** Demo/geliştirme tohum verisi. Hepsi isDemo=true olarak yazılır; üretim metriği değildir. */

export const CATEGORIES = [
  { slug: "yasam-tarzi", name: "Yaşam Tarzı", icon: "home", order: 1, description: "Günlük yaşam, ev, yemek ve ilham veren rutinler.", heroTitle: "Yaşam Tarzı", heroText: "Seyahat, moda, fitness, yemek, wellness ve daha fazlası… Yaşam tarzını paylaşan, ilham veren içerik üreticileri ve AI ikizleriyle tanış." },
  { slug: "fitness", name: "Fitness", icon: "dumbbell", order: 2, description: "Antrenman, beslenme ve motivasyon." },
  { slug: "seyahat", name: "Seyahat", icon: "plane", order: 3, description: "Rotalar, ipuçları ve keşif hikâyeleri." },
  { slug: "oyun", name: "Oyun", icon: "gamepad-2", order: 4, description: "Yayıncılar, e-spor ve oyun kültürü." },
  { slug: "muzik", name: "Müzik", icon: "music", order: 5, description: "Şarkıcılar, prodüktörler ve müzik sohbetleri." },
  { slug: "egitim", name: "Eğitim", icon: "book-open", order: 6, description: "Dil, kariyer ve kişisel gelişim." },
  { slug: "moda", name: "Moda", icon: "shirt", order: 7, description: "Stil, kombin ve trendler." },
  { slug: "sanat", name: "Sanat ve Yaratıcılık", icon: "palette", order: 8, description: "Resim, tasarım, fotoğraf ve el sanatları." },
  { slug: "is-dunyasi", name: "İş Dünyası", icon: "briefcase", order: 9, description: "Girişimcilik, kariyer ve finansal okuryazarlık." },
  { slug: "wellness", name: "Wellness", icon: "flower-2", order: 10, description: "Zihinsel sağlık, meditasyon ve denge." },
  { slug: "yemek", name: "Yemek", icon: "chef-hat", order: 11, parentSlug: "yasam-tarzi", description: "Tarifler ve mutfak sohbetleri." },
  { slug: "ev-yasam", name: "Ev & Yaşam", icon: "sofa", order: 12, parentSlug: "yasam-tarzi", description: "Dekorasyon ve düzen." },
  { slug: "evcil-dostlar", name: "Evcil Dostlar", icon: "paw-print", order: 13, parentSlug: "yasam-tarzi", description: "Evcil hayvan bakımı ve sevimli anlar." },
];

export const PLATFORM_PLANS = [
  { tier: "free" as const, name: "Ücretsiz", description: "HeyFans'ı keşfet, temel özellikleri dene.", priceMinor: 0, benefits: ["Sınırlı içeriklere erişim", "Herkese açık gönderileri görme", "Sınırlı sayıda profil görüntüleme"], entitlements: { contentAccess: "none" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 0, customRequests: false, prioritySupport: false } },
  { tier: "basic" as const, name: "Temel", description: "Daha fazla içerik, daha fazla eğlence.", priceMinor: 19_900, benefits: ["Daha fazla içeriğe erişim", "İçerik üreticilerini takip etme", "Sınırsız profil görüntüleme", "Aylık 50 sohbet kredisi"], entitlements: { contentAccess: "basic" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 50, customRequests: false, prioritySupport: false } },
  { tier: "premium" as const, name: "Premium", description: "Özel içeriklere eriş ve doğrudan sohbet et.", priceMinor: 39_900, isPopular: true, benefits: ["Aylık 150 sohbet kredisi", "İçerik üreticileriyle sohbet etme", "Sınırsız profil görüntüleme", "Öncelikli destek"], entitlements: { contentAccess: "premium" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 150, customRequests: false, prioritySupport: true } },
  { tier: "vip" as const, name: "VIP", description: "En özel deneyim, en yakın bağlantı.", priceMinor: 69_900, benefits: ["Tüm Premium avantajları", "Aylık 400 sohbet kredisi", "Öncelikli sohbet ve yanıtlar", "Özel istek gönderme imkânı", "Erken erişim ve özel etkinlikler"], entitlements: { contentAccess: "vip" as const, unlimitedChat: false, dailyChatAllowance: 0, monthlyCredits: 400, customRequests: true, prioritySupport: true } },
];

export const GIFTS = [
  { key: "gul", name: "Gül", icon: "flower", credits: 10, order: 1 },
  { key: "kalp", name: "Kalp", icon: "heart", credits: 25, order: 2 },
  { key: "kahve", name: "Kahve", icon: "coffee", credits: 50, order: 3 },
  { key: "tac", name: "Taç", icon: "crown", credits: 100, order: 4 },
  { key: "elmas", name: "Elmas", icon: "gem", credits: 250, order: 5 },
  { key: "roket", name: "Roket", icon: "rocket", credits: 500, order: 6 },
];

export const HELP_ARTICLES = [
  { slug: "ai-ikizi-nedir", category: "ai_twins", title: "AI ikizi nedir ve nasıl çalışır?", summary: "AI ikizlerinin creator onayıyla nasıl oluşturulduğunu ve sınırlarını öğren.", body: "AI ikizi, içerik üreticisinin açık izniyle oluşturulan ve onun onayladığı kişilik ayarları, bilgi kaynakları ve sınırlarla çalışan bir yapay zekâ asistanıdır. AI ikizi gerçek kişi değildir; tüm yanıtlar \"AI İkizi\" etiketiyle gösterilir. Creator ikizini istediği an duraklatabilir veya iznini geri çekebilir.", tags: ["ai", "ikiz", "yapay zeka"] },
  { slug: "hesap-olusturma", category: "account", title: "Hesap nasıl oluşturulur?", summary: "E-posta veya Google/Apple hesabınla kayıt olma adımları.", body: "Kayıt Ol sayfasında hayran veya içerik üreticisi yolculuğunu seç, adını, e-posta adresini ve güçlü bir şifre gir. E-posta adresine gelen doğrulama bağlantısına tıklayarak hesabını etkinleştir.", tags: ["kayıt", "hesap"] },
  { slug: "e-posta-dogrulama", category: "account", title: "Doğrulama e-postası gelmedi", summary: "Doğrulama bağlantısını yeniden isteme ve spam klasörü kontrolü.", body: "Hesap Doğrulama sayfasından yeni bir bağlantı isteyebilirsin. E-postalar birkaç dakika gecikebilir; spam/gereksiz klasörünü kontrol etmeyi unutma.", tags: ["doğrulama", "e-posta"] },
  { slug: "sifre-sifirlama", category: "account", title: "Şifremi unuttum", summary: "Şifre sıfırlama bağlantısı ile yeni şifre belirleme.", body: "Giriş sayfasındaki 'Şifreni mi unuttun?' bağlantısına tıkla, e-posta adresini gir. Gelen bağlantı 30 dakika geçerlidir.", tags: ["şifre"] },
  { slug: "abonelik-iptali", category: "subscriptions", title: "Aboneliğimi nasıl iptal ederim?", summary: "Abonelikler dönem sonunda sona erecek şekilde iptal edilir.", body: "Aboneliklerim sayfasından ilgili aboneliği seçip 'İptal et'e tıkla. Erişimin mevcut dönem sonuna kadar devam eder; sonraki dönem ücretlendirilmez.", tags: ["abonelik", "iptal"] },
  { slug: "kredi-nasil-kullanilir", category: "payments", title: "Sohbet kredileri nasıl kullanılır?", summary: "Kredilerin mesaj, görüşme ve hediyelerde kullanımı.", body: "Krediler AI ikizi mesajları, sesli/görüntülü görüşme dakikaları, hediyeler ve bahşişler için kullanılır. Her harcama Cüzdanım sayfasındaki hareket geçmişinde görünür. AI yanıtı üretilemezse harcanan kredi otomatik iade edilir.", tags: ["kredi", "cüzdan"] },
  { slug: "odeme-yontemleri", category: "payments", title: "Hangi ödeme yöntemleri kabul ediliyor?", summary: "Kart bilgileri ödeme kuruluşunun güvenli sayfasında alınır.", body: "Ödemeler lisanslı ödeme kuruluşu üzerinden alınır; kart bilgilerin HEYFANS sunucularında saklanmaz. Kabul edilen yöntemler ödeme sayfasında listelenir.", tags: ["ödeme", "kart"] },
  { slug: "iade-politikasi", category: "payments", title: "İade talebi nasıl oluşturulur?", summary: "Hatalı veya yetkisiz ödemeler için iade süreci.", body: "İletişim formundan 'Ödemeler' kategorisini seçerek işlem numarasıyla birlikte talep oluştur. Talepler finans ekibi tarafından incelenir.", tags: ["iade"] },
  { slug: "icerik-silme", category: "safety", title: "Verilerimi nasıl silerim?", summary: "Sohbet, AI hafızası ve hesap silme seçenekleri.", body: "Sohbetleri sohbet ekranından, AI hafızasını Kişiselleştirme sayfasından silebilirsin. Hesap silme talebi Hesap Ayarları'ndan başlatılır; finansal kayıtlar yasal saklama süresi boyunca anonimleştirilerek tutulur.", tags: ["veri", "silme", "kvkk"] },
  { slug: "sikayet-bildirimi", category: "safety", title: "Bir içeriği veya profili nasıl bildiririm?", summary: "Taklit, taciz veya uygunsuz içerik bildirimi.", body: "İçerik, profil veya sohbet ekranındaki 'Bildir' seçeneğini kullan. Acil güvenlik durumları için Güven ve Güvenlik sayfasındaki acil bildirim formunu kullan.", tags: ["şikayet", "rapor"] },
  { slug: "creator-basvurusu", category: "creators", title: "İçerik üreticisi olarak nasıl başvururum?", summary: "Creator karşılama sihirbazı ve doğrulama adımları.", body: "Kayıt olurken 'İçerik Üreticisiyim' seçeneğini seç ya da hesabından Creator Studio'ya geç. Kimlik ve sosyal hesap doğrulaması, AI ikizi rıza adımları ve inceleme sonrasında profilin yayına alınır.", tags: ["creator", "başvuru"] },
  { slug: "ai-ikizi-izinleri", category: "creators", title: "AI ikizimin izinlerini nasıl geri çekerim?", summary: "Ses/görünüm ve persona izinlerinin yönetimi.", body: "Creator Studio > Ses ve Görünüm ve Sınırlar ve İzinler sayfalarından izinlerini istediğin an geri çekebilirsin. Geri çekilen izinle ilgili özellikler derhal durdurulur.", tags: ["izin", "rıza"] },
  { slug: "odeme-alma", category: "creators", title: "Kazançlarımı nasıl çekerim?", summary: "Hak ediş, bekleme süresi ve ödeme talebi.", body: "Gelirler sayfasında kullanılabilir bakiyeni görürsün. Ödemeler sayfasından doğrulanmış IBAN hesabına ödeme talebi oluşturabilirsin. Hak edişler bekleme süresi sonunda kullanılabilir olur.", tags: ["ödeme", "kazanç"] },
  { slug: "uygulama-sorunlari", category: "technical", title: "Sayfa yüklenmiyor veya sohbet yanıt vermiyor", summary: "Temel sorun giderme adımları.", body: "Tarayıcını güncelle, önbelleği temizle ve tekrar dene. AI ikizi geçici olarak yanıt veremezse kredin iade edilir. Sorun sürerse destek talebi oluştur.", tags: ["hata", "teknik"] },
  { slug: "yas-dogrulama", category: "safety", title: "Yaş doğrulaması neden gerekli?", summary: "Belirli özellikler için yaş güvencesi.", body: "HEYFANS 18 yaş ve üzeri kullanıcılar içindir. Bazı özellikler güçlü yaş doğrulaması gerektirebilir; doğrulama yetkili sağlayıcı aracılığıyla yapılır ve kimlik belgen HEYFANS'ta saklanmaz.", tags: ["yaş", "güvenlik"] },
  { slug: "bildirim-ayarlari", category: "account", title: "Bildirim tercihlerimi nasıl değiştiririm?", summary: "E-posta ve uygulama içi bildirimler.", body: "Hesap ve Ödeme Ayarları sayfasındaki bildirim bölümünden hangi bildirimleri almak istediğini seçebilirsin.", tags: ["bildirim"] },
];

const LEGAL_NOTE = "Bu metin TASLAKTIR ve yayın öncesi hukuk uzmanı onayı gerektirir. Kesinleşmiş hukuki belge değildir.";

export const LEGAL_PAGES: { slug: string; title: string; summary: string; sections: { id?: string; heading: string; body: string }[] }[] = [
  {
    slug: "privacy",
    title: "Gizlilik Politikası",
    summary: "Verilerin nasıl toplandığı, işlendiği ve haklarının nasıl kullanılacağı. " + LEGAL_NOTE,
    sections: [
      { heading: "Genel Bakış", body: "HEYFANS olarak kişisel verilerini 6698 sayılı KVKK ve uygulanabilir olduğu ölçüde GDPR ilkelerine uygun şekilde işlemeyi hedefliyoruz. Bu taslak; hangi verilerin, hangi amaçla ve hangi hukuki sebeple işlendiğini açıklar." },
      { heading: "İşlenen Veri Türleri", body: "Hesap ve iletişim bilgileri; kullanım ve cihaz bilgileri; ödeme işlem kayıtları (kart bilgileri ödeme kuruluşunda tutulur); sohbet kayıtları; AI hafızası (yalnız izin verirsen); creator doğrulama sonuçları (kimlik belgeleri saklanmaz)." },
      { heading: "İşleme Amaçları", body: "Hizmetin sunulması, güvenlik ve dolandırıcılık önleme, ödeme ve hak ediş işlemleri, yasal yükümlülükler, izin verdiğin kişiselleştirme." },
      { heading: "AI ve Sohbet Verileri", body: "AI ikizi yanıtları üretmek için mesajların ve creator'ın onayladığı bilgi kaynaklarının ilgili bölümleri, yapılandırılan AI sağlayıcısına iletilir. Sağlayıcı ve aktarım koşulları yayın öncesi bu bölümde netleştirilecektir." },
      { heading: "Saklama ve Silme", body: "Sohbetlerini ve AI hafızanı istediğin an silebilirsin. Finansal kayıtlar yasal saklama süreleri boyunca tutulur." },
      { heading: "Kullanıcı Hakları", body: "Erişim, düzeltme, silme, işlemeye itiraz ve veri taşınabilirliği haklarını İletişim sayfasındaki 'Gizlilik' kategorisiyle kullanabilirsin." },
      { heading: "Başvuru ve İletişim", body: "Veri sorumlusu ve iletişim bilgileri şirket bilgileri kesinleştiğinde eklenecektir." },
    ],
  },
  {
    slug: "terms",
    title: "Kullanım Şartları",
    summary: "Platformu kullanmadan önce bilinmesi gereken temel kurallar ve karşılıklı sorumluluklar. " + LEGAL_NOTE,
    sections: [
      { heading: "Hesap ve Uygunluk", body: "HEYFANS 18 yaş ve üzeri kullanıcılar içindir. Hesap güvenliğinden sen sorumlusun." },
      { heading: "AI İkizleri", body: "AI ikizleri yapay zekâ tarafından üretilen yanıtlar verir ve gerçek creator değildir. AI çıktıları hatalı olabilir; tavsiye niteliği taşımaz." },
      { heading: "Ücretli Hizmetler", body: "Abonelikler, krediler ve tekil satın almalar ödeme sayfasında gösterilen koşullara tabidir. Abonelikler dönem sonunda iptal edilebilir." },
      { heading: "İçerik Hakları", body: "Creator içerikleri creator'a aittir; izinsiz kopyalanamaz veya dağıtılamaz." },
      { heading: "Yasaklı Davranışlar", body: "Taciz, taklit, reşit olmayanlarla ilgili her türlü uygunsuz içerik, platform dışı ödeme talepleri ve kötüye kullanım yasaktır." },
      { heading: "Değişiklikler", body: "Şartlarda yapılacak önemli değişiklikler önceden bildirilecektir." },
      { id: "mesafeli-satis", heading: "Mesafeli Satış ve Ön Bilgilendirme (Taslak)", body: "Satıcı bilgileri, hizmetin temel nitelikleri, toplam fiyat (vergiler dahil), ödeme ve ifa koşulları ile cayma hakkına ilişkin bilgiler ödeme sayfasında sipariş özetiyle birlikte gösterilir. Anında ifa edilen dijital içerik ve hizmetlerde cayma hakkının istisnası, 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında hukuk incelemesinden sonra kesinleştirilecektir." },
    ],
  },
  {
    slug: "creator-agreement",
    title: "Creator Sözleşmesi",
    summary: "AI ikizi yetkilendirmesi, içerik hakları ve gelir paylaşımı ilkeleri. " + LEGAL_NOTE,
    sections: [
      { heading: "Kimlik ve Hesap Sahipliği", body: "Creator, doğrulanmış kimliğiyle hesabın sahibidir ve başkası adına hesap açamaz." },
      { heading: "AI İkizi Yetkilendirmesi", body: "AI ikizi yalnız creator'ın açık rızası, onayladığı persona ve bilgi kaynaklarıyla çalışır. Rıza her an geri çekilebilir." },
      { heading: "Görsel ve Ses Benzerliği", body: "Ses/görünüm benzerliği özellikleri ayrı ve açık izin gerektirir; izin geri çekildiğinde derhal durdurulur." },
      { heading: "Gelir ve Hak Ediş", body: "Taslak model: net gelirin %70'i creator'a, %30'u platforma. 'Net' tanımı (ödeme kuruluşu ücreti, vergiler, iade ve ters ibraz) yayın öncesi kesinleştirilecektir." },
      { heading: "İçerik Kuralları", body: "Topluluk Kuralları ve yürürlükteki mevzuat geçerlidir." },
      { heading: "Fesih", body: "Taraflar sözleşmeyi bildirimle sona erdirebilir; tahakkuk etmiş hak edişler ödenir." },
    ],
  },
  {
    slug: "community-guidelines",
    title: "Topluluk Kuralları",
    summary: "Saygılı, güvenli ve gerçek bağlantılar için ortak kurallar. " + LEGAL_NOTE,
    sections: [
      { heading: "Desteklediğimiz Davranışlar", body: "Saygılı iletişim, güvenli paylaşım ve şeffaf AI deneyimi." },
      { heading: "İzin Verilmeyen Davranışlar", body: "Taciz ve tehdit, izinsiz kimlik benzetimi (taklit), istismar, nefret söylemi, spam ve dolandırıcılık." },
      { heading: "Reşit Olmayanların Korunması", body: "Reşit olmayanları içeren her türlü cinsel veya istismar niteliğindeki içerik sıfır tolerans ile kaldırılır ve yetkililere bildirilir." },
      { heading: "Bildirim Süreci", body: "Bildirim → değerlendirme → karar ve itiraz hakkı." },
    ],
  },
  {
    slug: "copyright",
    title: "Telif ve İçerik Kaldırma",
    summary: "Telif hakkı ihlali, izinsiz içerik ve AI ile kimliğe bürünme talepleri için başvuru. " + LEGAL_NOTE,
    sections: [
      { heading: "Başvuru", body: "Hak sahibi; içerik bağlantısı, hak sahipliğine dair açıklama ve iletişim bilgileriyle başvurur." },
      { heading: "Değerlendirme Süreci", body: "Başvuru ve belge → inceleme → gerekirse içeriğin geçici kaldırılması → karar ve itiraz." },
      { heading: "Kötüye Kullanım", body: "Gerçeğe aykırı başvurular hesabın kısıtlanmasına yol açabilir." },
    ],
  },
  {
    slug: "cookies",
    title: "Çerez Politikası",
    summary: "Çerez türleri, amaçları ve tercih yönetimi. " + LEGAL_NOTE,
    sections: [
      { heading: "Zorunlu Çerezler", body: "Oturum, güvenlik ve tercihlerin hatırlanması için gereklidir; devre dışı bırakılamaz." },
      { heading: "İşlevsel Çerezler", body: "Dil ve görünüm tercihleri gibi deneyimi iyileştiren çerezler. Yalnız izninle." },
      { heading: "Analitik Çerezler", body: "Platform performansını anlamamıza yardımcı olur. Yalnız izninle ve izin öncesi çalışmaz." },
      { heading: "Pazarlama Çerezleri", body: "Kampanya ölçümü için. Yalnız izninle." },
      { heading: "Tercih Yönetimi", body: "Tercihlerini bu sayfadan her zaman değiştirebilir veya rızanı geri çekebilirsin." },
    ],
  },
  {
    slug: "trust-and-safety",
    title: "Güven ve Güvenlik",
    summary: "Doğrulanmış creator'lar, açık rıza ve güvenli deneyimler. " + LEGAL_NOTE,
    sections: [
      { heading: "Doğrulanmış Creator", body: "Kimlik ve hesap sahipliği doğrulanmadan creator profili yayına alınmaz." },
      { heading: "Açık AI Bildirimi", body: "AI ikizi yanıtları her zaman 'AI İkizi' etiketiyle gösterilir." },
      { heading: "Creator Onayı ve İzin Yönetimi", body: "AI ikizi ve benzerlik özellikleri yalnız creator'ın açık izniyle çalışır ve geri çekilebilir." },
      { heading: "İçerik Moderasyonu", body: "Otomatik filtreler ve insan incelemesi birlikte çalışır." },
      { heading: "Şikâyet ve İtiraz", body: "Her karar için itiraz hakkı vardır." },
    ],
  },
];
