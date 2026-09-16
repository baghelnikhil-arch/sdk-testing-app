import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "./Button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-subtle px-6 py-16 text-center md:py-24",
        className,
      )}
    >
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-card">
        <Icon
          className="h-6 w-6 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </span>

      <h2 className="font-display text-2xl tracking-tight text-balance text-foreground">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {action && (
            <ButtonLink href={action.href} size="lg">
              {action.label}
            </ButtonLink>
          )}
          {secondaryAction && (
            <ButtonLink
              href={secondaryAction.href}
              variant="secondary"
              size="lg"
            >
              {secondaryAction.label}
            </ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}
