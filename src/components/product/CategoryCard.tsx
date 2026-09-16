import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export function CategoryCard({
  category,
  priority = false,
  className,
}: {
  category: Category;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/shop/${category.slug}`}
      className={cn(
        "group relative flex aspect-4/5 overflow-hidden rounded-lg bg-muted sm:aspect-3/4",
        className,
      )}
    >
      <Image
        src={category.image}
        alt=""
        fill
        priority={priority}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
      />

      {/* Gradient keeps the label legible whatever the photograph does. */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/15 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mt-auto flex w-full items-end justify-between gap-3 p-5">
        <div>
          <p className="text-[0.6875rem] font-medium tracking-[0.14em] text-white/70 uppercase">
            {category.tagline}
          </p>
          <h3 className="mt-1 font-display text-xl text-white md:text-2xl">
            {category.name}
          </h3>
        </div>

        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors duration-200 group-hover:bg-white group-hover:text-foreground"
          aria-hidden="true"
        >
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
