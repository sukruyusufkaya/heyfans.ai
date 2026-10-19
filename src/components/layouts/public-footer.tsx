import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { FOOTER_COLUMNS } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-[#fffafd]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_2.6fr_1.4fr] lg:px-8">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-strong">
            Gerçek İçerik Üreticileri.
            <br />
            Yetkilendirilmiş AI İkizleri. Gerçek Bağlantılar.
          </p>
          <p className="mt-6 text-xs text-muted">© {year} HEYFANS. Tüm hakları saklıdır.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-xs font-black text-ink">{col.title}</p>
              <ul className="grid gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-xs text-muted-strong hover:text-brand-500">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <p className="text-sm font-black text-ink">Yeniliklerden Haberdar Ol</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-strong">Yeni içerik üreticileri, özellikler ve kampanyalar hakkında e-posta al.</p>
          <NewsletterForm />
          <div className="mt-5 flex items-center gap-4 text-ink-soft">
            <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-brand-500">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
            </a>
            <a href={siteConfig.social.x} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="hover:text-brand-500">
              <svg viewBox="0 0 24 24" className="size-[16px]" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.3l4.4 5.8zm-1.1 18h1.7L6.3 3.9H4.5z" /></svg>
            </a>
            <a href={siteConfig.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-brand-500">
              <svg viewBox="0 0 24 24" className="size-[19px]" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1z" /></svg>
            </a>
            <a href={siteConfig.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-brand-500">
              <svg viewBox="0 0 24 24" className="size-[17px]" fill="currentColor"><path d="M16.6 2h-3.4v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.3 6.3 0 1 0 5.4 6.3V8.6a8 8 0 0 0 4.7 1.5V6.7A4.7 4.7 0 0 1 16.6 2z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
