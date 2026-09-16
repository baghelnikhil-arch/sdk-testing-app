"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { Button } from "./Button";
import { inputStyles } from "./field";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "done";

export function Newsletter({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // No backend in the demo — this stands in for the real subscribe call.
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status !== "idle") return;

    setStatus("submitting");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setStatus("done");
  }

  return (
    <section className={cn("bg-subtle", className)}>
      <div className="container-page section-y">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-card">
            <Mail
              className="h-5 w-5 text-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </span>

          <h2 className="font-display text-3xl tracking-tight text-balance text-foreground md:text-4xl">
            Stay in the loop
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
            Get updates on new arrivals and exclusive offers. One email a month,
            never more.
          </p>

          {status === "done" ? (
            <p
              role="status"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Thanks — check your inbox to confirm.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputStyles("h-11 flex-1 bg-background py-0")}
              />
              <Button
                type="submit"
                size="md"
                disabled={status === "submitting"}
                className="sm:w-32"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="sr-only">Subscribing</span>
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            </form>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            By subscribing you agree to our privacy policy.
          </p>
        </div>
      </div>
    </section>
  );
}
