import { SITE_AUTHOR } from "@/constants/site-author.constant";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  className?: string;
};

type GitHubMarkProps = {
  className?: string;
};

function GitHubMark(props: GitHubMarkProps) {
  const { className } = props;

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 2C6.477 2 2 6.584 2 12.217c0 4.506 2.865 8.327 6.839 9.676.5.093.682-.221.682-.491 0-.242-.009-.883-.014-1.733-2.782.617-3.369-1.368-3.369-1.368-.454-1.178-1.11-1.491-1.11-1.491-.908-.635.069-.622.069-.622 1.004.072 1.532 1.053 1.532 1.053.892 1.561 2.341 1.111 2.91.85.092-.661.35-1.111.636-1.367-2.22-.258-4.555-1.135-4.555-5.052 0-1.116.39-2.029 1.03-2.744-.103-.258-.447-1.297.098-2.702 0 0 .84-.274 2.75 1.047A9.37 9.37 0 0 1 12 6.844c.85.004 1.705.117 2.504.343 1.909-1.321 2.747-1.047 2.747-1.047.547 1.405.203 2.444.1 2.702.64.715 1.028 1.628 1.028 2.744 0 3.927-2.339 4.791-4.566 5.044.359.316.679.942.679 1.899 0 1.371-.012 2.477-.012 2.814 0 .272.18.588.688.488C19.138 20.54 22 16.72 22 12.217 22 6.584 17.523 2 12 2Z" />
    </svg>
  );
}

export function SiteFooter(props: SiteFooterProps) {
  const { className } = props;

  return (
    <footer
      className={cn(
        "flex h-9 shrink-0 items-center justify-center gap-2 border-t border-border/80 bg-background/80 px-3 text-xs text-muted-foreground backdrop-blur-md",
        className,
      )}
    >
      <span>
        Made by{" "}
        <span className="font-medium text-foreground/80">{SITE_AUTHOR.name}</span>
      </span>
      <span aria-hidden className="text-border">
        ·
      </span>
      <a
        href={SITE_AUTHOR.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <GitHubMark className="size-3.5" />
        {SITE_AUTHOR.githubLabel}
      </a>
    </footer>
  );
}
