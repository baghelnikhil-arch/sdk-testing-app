import Link from "next/link";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "subtle"
  /** For use on dark photographic panels, where the accent would sink. */
  | "inverse"
  | "inverseOutline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-card hover:bg-primary-hover",
  secondary:
    "border border-border-strong bg-background text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  subtle: "bg-muted text-foreground hover:bg-border",
  inverse: "bg-background text-foreground shadow-card hover:bg-white/90",
  inverseOutline:
    "border border-white/35 text-white hover:bg-white/10 hover:border-white/55",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[0.9375rem]",
  icon: "h-10 w-10",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles(variant, size, className)}
      {...props}
    />
  );
}

type ButtonLinkProps = React.ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Same visual language as Button, but renders a real anchor for navigation. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonStyles(variant, size, className)} {...props} />;
}
