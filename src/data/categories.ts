import type { Category } from "@/types";
import { img } from "./images";

/**
 * Categories are data, not routes. `/shop/[category]` reads from this list, so
 * adding a category here immediately produces a working page.
 */
export const categories: Category[] = [
  {
    slug: "men",
    name: "Men",
    description:
      "Relaxed tailoring, soft knits and hard-wearing outerwear built for a wardrobe you actually reach for.",
    tagline: "Everyday tailoring",
    image: img("photo-1617137968427-85924c800a22", 900, 1100),
  },
  {
    slug: "women",
    name: "Women",
    description:
      "Fluid silhouettes in natural fibres — pieces designed to layer, travel and last well beyond a season.",
    tagline: "Considered silhouettes",
    image: img("photo-1483985988355-763728e1935b", 900, 1100),
  },
  {
    slug: "accessories",
    name: "Accessories",
    description:
      "Leather goods, eyewear and small objects finished by hand and made to age gracefully.",
    tagline: "Finishing touches",
    image: img("photo-1584917865442-de89df76afd3", 900, 1100),
  },
  {
    slug: "new-arrivals",
    name: "New Arrivals",
    description:
      "The latest additions to the collection, released in small runs as they come out of the workshop.",
    tagline: "Just landed",
    image: img("photo-1490481651871-ab68de25d43d", 900, 1100),
  },
];

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
