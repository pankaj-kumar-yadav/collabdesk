"use client";

import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

type GlobalLoaderProps = {
  label?: string;
  className?: string;
};

export function GlobalLoader(props: GlobalLoaderProps) {
  const { label = "Loading…", className } = props;

  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center p-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <FadeIn className="flex flex-col items-center gap-3 text-center">
        <div className="brand text-lg">
          Collab<span>Desk</span>
        </div>
        <span
          className="global-loader-spin size-5 rounded-full border-2 border-muted-foreground/25 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">{label}</p>
      </FadeIn>
    </div>
  );
}
