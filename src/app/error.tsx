"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

/**
 * The visible error boundary. It shows a translated message and never the
 * underlying failure, which stays in the server logs where it belongs.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useI18n();

  useEffect(() => {
    console.error("[tabea] rendering error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          {dict.errors.unexpectedTitle}
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {dict.errors.unexpectedBody}
        </p>
      </div>
      <Button variant="primary" onClick={reset}>
        {dict.common.retry}
      </Button>
    </div>
  );
}
