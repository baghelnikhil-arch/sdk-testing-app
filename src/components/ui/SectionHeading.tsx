import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 md:mb-10",
        centered
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl leading-tight tracking-tight text-balance text-foreground md:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          {action.label}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
