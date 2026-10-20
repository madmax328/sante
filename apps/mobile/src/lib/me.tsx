import { createContext, useContext, type ReactNode } from "react";
import { useApi } from "./api";
import { setCurrency } from "./format";

export interface Me {
  user: { id: string; name: string; email: string; emailVerified?: boolean };
  onboarded: boolean;
  premium: boolean;
  subscription: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  /** Premium bought in the app (managed in the App Store / Google Play) */
  store?: { source: string; expiresAt: string | null; willRenew: boolean; billingIssue: boolean } | null;
  numbersHidden: boolean;
  sportEnabled: boolean;
  budget: { enabled: boolean; weekly: number };
  /** Country of the shops and its currency (older servers: France, euro) */
  market?: string;
  currency?: string;
  ai: { left: number } | null;
  devices?: { appleHealth: string | null; healthConnect: string | null };
}

const MeContext = createContext<{ me: Me; reload: () => Promise<void> } | null>(null);

export function MeProvider({ me, reload, children }: { me: Me; reload: () => Promise<void>; children: ReactNode }) {
  setCurrency(me.currency);
  return <MeContext.Provider value={{ me, reload }}>{children}</MeContext.Provider>;
}

export function useMe() {
  const v = useContext(MeContext);
  if (!v) throw new Error("useMe outside MeProvider");
  return v;
}

export function useMeQuery() {
  return useApi<Me>("/me");
}
