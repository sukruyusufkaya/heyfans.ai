"use client";
import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { voteHelpfulAction } from "./actions";

export function HelpFeedback({ slug }: { slug: string }) {
  const t = useT();
  const [voted, setVoted] = useState<boolean | null>(null);
  const [pending, start] = useTransition();

  if (voted !== null) {
    return (
      <p role="status" className="text-sm font-bold text-success">
        {t("Geri bildirimin için teşekkürler.")}
      </p>
    );
  }
  function vote(helpful: boolean) {
    start(async () => {
      const res = await voteHelpfulAction(slug, helpful);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setVoted(helpful);
    });
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm font-extrabold text-ink" id="help-feedback-q">
        {t("Bu makale işine yaradı mı?")}
      </p>
      <div role="group" aria-labelledby="help-feedback-q" className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" shape="pill" disabled={pending} onClick={() => vote(true)}>
          <ThumbsUp /> {t("Evet")}
        </Button>
        <Button type="button" variant="secondary" size="sm" shape="pill" disabled={pending} onClick={() => vote(false)}>
          <ThumbsDown /> {t("Hayır")}
        </Button>
      </div>
    </div>
  );
}
