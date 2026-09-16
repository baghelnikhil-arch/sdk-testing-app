/** Store-wide configuration. Everything copy-ish lives here so it is easy to rebrand. */
export const SITE = {
  name: "Aurelle",
  tagline: "Modern essentials, thoughtfully made.",
  description:
    "Aurelle is a demo storefront featuring considered clothing and accessories for everyday wear.",
  email: "hello@aurelle.store",
  phone: "+1 (415) 555-0132",
  address: "218 Mission Street, San Francisco, CA 94105",
  hours: [
    { days: "Monday – Friday", time: "9:00 AM – 6:00 PM" },
    { days: "Saturday", time: "10:00 AM – 4:00 PM" },
    { days: "Sunday", time: "Closed" },
  ],
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const FOOTER_SECTIONS = [
  {
    title: "Shop",
    links: [
      { href: "/shop/men", label: "Men" },
      { href: "/shop/women", label: "Women" },
      { href: "/shop/accessories", label: "Accessories" },
      { href: "/shop/new-arrivals", label: "New Arrivals" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/settings/integrations", label: "Integrations" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Shipping" },
      { href: "/contact", label: "Returns" },
      { href: "/contact", label: "FAQ" },
    ],
  },
] as const;

/** Commerce rules kept in one place so a real pricing service can replace them. */
export const FREE_SHIPPING_THRESHOLD = 150;
export const SHIPPING_FLAT_RATE = 12;
export const PRODUCTS_PER_PAGE = 12;
