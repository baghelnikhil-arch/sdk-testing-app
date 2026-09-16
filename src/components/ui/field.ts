import { cn } from "@/lib/utils";

/** One definition of what a form control looks like, shared by every input. */
export const inputStyles = (className?: string) =>
  cn(
    "w-full rounded-md border border-border-strong bg-background px-3.5 py-2.5 text-sm text-foreground",
    "placeholder:text-muted-foreground transition-colors duration-150",
    "hover:border-foreground/25 focus:border-primary",
    "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
    className,
  );

export const labelStyles = (className?: string) =>
  cn("mb-1.5 block text-sm font-medium text-foreground", className);

/** Native selects, styled once. Pair with a chevron positioned by the caller. */
export const selectStyles = (className?: string) =>
  cn(
    "h-11 w-full cursor-pointer appearance-none rounded-md border border-border-strong bg-background py-0 pr-9 pl-3.5",
    "text-sm font-medium text-foreground transition-colors duration-150",
    "hover:border-foreground/25 focus:border-primary",
    "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70",
    className,
  );
