import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { login } from "@/app/actions/auth";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/" } = await searchParams;

  return (
    <div className="container-page flex justify-center py-16 md:py-24">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to reach your cart, wishlist and orders.</p>
        </div>

        <AuthForm mode="login" action={login} next={next} />

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {SITE.name} is a demo. Do not reuse a password from anywhere else.
        </p>
      </div>
    </div>
  );
}
