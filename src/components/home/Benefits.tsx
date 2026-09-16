import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";

const BENEFITS = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "Complimentary delivery on every order over $150.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payment",
    description: "Encrypted checkout with every major card and wallet.",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "Thirty days to change your mind, return postage covered.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Real people, reachable whenever you need them.",
  },
];

export function Benefits() {
  return (
    <section className="border-y border-border bg-subtle">
      <div className="container-page section-y">
        <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-background shadow-card">
                <benefit.icon
                  className="h-5 w-5 text-foreground"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <h3 className="mt-4 text-[0.9375rem] font-medium text-foreground">
                {benefit.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {benefit.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
