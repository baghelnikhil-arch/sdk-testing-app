import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { signup } from "@/app/actions/auth";
import { SITE } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/" } = await searchParams;

  /*
   * Checked here rather than in the proxy, which can only see that a cookie
   * exists. A cookie whose session has expired or been revoked would otherwise
   * bounce its owner away from the one page that lets them sign in again.
   */
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="container-page flex justify-center py-16 md:py-24">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Save your cart and wishlist, and keep your order history.</p>
        </div>

        <AuthForm mode="signup" action={signup} next={next} />

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {SITE.name} is a demo. Do not reuse a password from anywhere else.
        </p>
      </div>
    </div>
  );
}
