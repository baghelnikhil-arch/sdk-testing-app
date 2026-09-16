import { cn } from "@/lib/utils";

type BadgeTone = "sale" | "neutral" | "accent" | "outline";

const TONES: Record<BadgeTone, string> = {
  sale: "bg-sale text-white",
  neutral: "bg-foreground/85 text-background backdrop-blur-sm",
  accent: "bg-accent-50 text-accent-700",
  outline: "border border-border-strong bg-background/90 text-muted-foreground",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-1 text-[0.6875rem] font-semibold tracking-wide uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
