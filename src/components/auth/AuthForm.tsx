"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputStyles, labelStyles } from "@/components/ui/field";
import type { AuthState } from "@/app/actions/auth";

type Action = (
  state: AuthState | undefined,
  formData: FormData,
) => Promise<AuthState>;

function Field({
  id,
  label,
  error,
  hint,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.ComponentPropsWithoutRef<"input">) {
  return (
    <div>
      <label htmlFor={id} className={labelStyles()}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={inputStyles(error ? "border-sale focus:border-sale" : undefined)}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-sale">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Sign in and sign up are the same form with different fields, so they share one
 * component. Validation lives in the Server Action — the browser never decides
 * whether credentials are acceptable.
 */
export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "signup";
  action: Action;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      {state?.errors?.form && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-sale/25 bg-sale/5 px-4 py-3 text-sm text-sale"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.errors.form}
        </p>
      )}

      {isSignup && (
        <Field
          id="name"
          label="Name"
          autoComplete="name"
          defaultValue={state?.values?.name}
          error={state?.errors?.name}
          placeholder="Jordan Ellis"
        />
      )}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state?.values?.email}
        error={state?.errors?.email}
        placeholder="you@example.com"
      />

      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        error={state?.errors?.password}
        hint={isSignup ? "At least 8 characters." : undefined}
      />

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSignup ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={
            (isSignup ? "/login" : "/signup") +
            (next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "")
          }
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
