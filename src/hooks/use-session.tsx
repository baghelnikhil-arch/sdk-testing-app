"use client";

import { createContext, useContext } from "react";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Who is signed in, for client components.
 *
 * Seeded by the root layout from the verified server-side session rather than
 * fetched, so there is no flash of "signed out" on first paint. It carries only
 * what the interface needs to render — never a token.
 */
const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
