"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

/** The single place wishlist toggling is implemented — reused on cards and PDP. */
export function WishlistButton({
  productId,
  productName,
  className,
  size = "md",
}: {
  productId: string;
  productName: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { isWishlisted, toggle, hydrated } = useWishlist();
  const [pulse, setPulse] = useState(false);

  const active = hydrated && isWishlisted(productId);
  const iconSize = size === "sm" ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]";

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        active
          ? `Remove ${productName} from wishlist`
          : `Add ${productName} to wishlist`
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
        if (!active) {
          setPulse(true);
          window.setTimeout(() => setPulse(false), 300);
        }
      }}
      className={cn(
        "flex items-center justify-center rounded-full transition-colors duration-150",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
    >
      <Heart
        className={cn(
          iconSize,
          "transition-colors duration-150",
          active ? "fill-sale text-sale" : "text-foreground",
          pulse && "animate-pop",
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </button>
  );
}
