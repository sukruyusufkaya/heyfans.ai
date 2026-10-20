"use client";
import { useActionState } from "react";
import { subscribeNewsletter } from "@/features/public/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function NewsletterForm() {
  const t = useT();
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  return (
    <form action={action} className="mt-3">
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          {t("E-posta adresin")}
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("E-posta adresin")}
          className="h-10 min-w-0 flex-1 rounded-full border border-line bg-white px-4 text-xs outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
        <Button type="submit" size="sm" shape="pill" loading={pending} className="h-10 px-5">
          {t("Abone Ol")}
        </Button>
      </div>
      {state && (
        <p role="status" className={`mt-2 text-[11px] font-semibold ${state.ok ? "text-success" : "text-danger"}`}>
          {state.ok ? state.message : state.error}
        </p>
      )}
    </form>
  );
}
