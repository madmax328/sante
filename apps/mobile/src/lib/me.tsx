import { createContext, useContext, type ReactNode } from "react";
import { useApi } from "./api";

export interface Me {
  user: { id: string; name: string; email: string; emailVerified?: boolean };
  onboarded: boolean;
  premium: boolean;
  subscription: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  numbersHidden: boolean;
  sportEnabled: boolean;
  budget: { enabled: boolean; weekly: number };
  ai: { left: number } | null;
  devices?: { appleHealth: string | null; healthConnect: string | null };
}

const MeContext = createContext<{ me: Me; reload: () => Promise<void> } | null>(null);

export function MeProvider({ me, reload, children }: { me: Me; reload: () => Promise<void>; children: ReactNode }) {
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
