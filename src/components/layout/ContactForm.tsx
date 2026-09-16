"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputStyles, labelStyles } from "@/components/ui/field";

type Status = "idle" | "sending" | "sent";

const FIELDS = [
  {
    id: "name",
    label: "Name",
    type: "text",
    autoComplete: "name",
    placeholder: "Jordan Ellis",
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    autoComplete: "email",
    placeholder: "you@example.com",
  },
  {
    id: "subject",
    label: "Subject",
    type: "text",
    autoComplete: "off",
    placeholder: "A question about sizing",
  },
] as const;

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  // Demo only — no request is sent anywhere.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="flex flex-col items-start rounded-xl border border-border bg-subtle p-8"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-50">
          <Check className="h-5 w-5 text-accent-600" aria-hidden="true" />
        </span>

        <h2 className="mt-5 font-display text-2xl tracking-tight text-foreground">
          Message sent
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Thanks for getting in touch — we usually reply within one business day.
          This is a demo store, so nothing was actually sent.
        </p>

        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-6 shadow-card md:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.id}
            className={field.id === "subject" ? "sm:col-span-2" : undefined}
          >
            <label htmlFor={field.id} className={labelStyles()}>
              {field.label}
            </label>
            <input
              id={field.id}
              name={field.id}
              type={field.type}
              required
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              className={inputStyles()}
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <label htmlFor="message" className={labelStyles()}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            placeholder="Tell us what you need a hand with."
            className={inputStyles("resize-y")}
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={status === "sending"}
        className="mt-6 w-full sm:w-auto sm:px-8"
      >
        {status === "sending" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        {status === "sending" ? "Sending" : "Send Message"}
      </Button>
    </form>
  );
}
