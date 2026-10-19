import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { api } from "./api";

/**
 * In-app purchases (App Store, Google Play) through RevenueCat. The buyer is
 * identified by the Sorloo user id, so Premium follows the account on the
 * website too; the server checks every purchase with RevenueCat.
 */
const KEY = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY });

let configured = false;
let currentUser: string | null = null;

export function purchasesAvailable(): boolean {
  return Platform.OS !== "web" && !!KEY;
}

/** Links purchases to the signed-in account (called once the account is known). */
export async function setupPurchases(userId: string): Promise<void> {
  if (!purchasesAvailable() || currentUser === userId) return;
  try {
    if (!configured) {
      Purchases.configure({ apiKey: KEY!, appUserID: userId });
      configured = true;
    } else {
      await Purchases.logIn(userId);
    }
    currentUser = userId;
  } catch (e) {
    console.warn("purchases setup failed", e);
  }
}

/** On sign-out: the next account must not inherit these purchases. */
export async function resetPurchases(): Promise<void> {
  if (!configured || !currentUser) return;
  currentUser = null;
  await Purchases.logOut().catch(() => undefined);
}

export interface Plan {
  key: "monthly" | "yearly";
  pkg: PurchasesPackage;
  price: string;
  /** Yearly plan: its price per month */
  perMonth: string | null;
  /** Free trial length offered by the store ("7 jours"…), if any */
  trial: { count: number; unit: string } | null;
  amount: number;
}

/** The plans configured in RevenueCat (current offering), with prices from the store. */
export async function loadPlans(): Promise<Plan[]> {
  if (!purchasesAvailable() || !configured) return [];
  const offering = (await Purchases.getOfferings()).current;
  if (!offering) return [];
  const plans: Plan[] = [];
  for (const [key, pkg] of [
    ["yearly", offering.annual],
    ["monthly", offering.monthly],
  ] as const) {
    if (!pkg) continue;
    const p = pkg.product;
    const intro = p.introPrice;
    plans.push({
      key,
      pkg,
      price: p.priceString,
      perMonth: key === "yearly" ? p.pricePerMonthString : null,
      trial: intro && intro.price === 0 ? { count: intro.cycles * intro.periodNumberOfUnits, unit: intro.periodUnit } : null,
      amount: p.price,
    });
  }
  return plans;
}

/** Buys a plan; true when Premium is active on the account afterwards. */
export async function buy(plan: Plan): Promise<"premium" | "cancelled" | "pending"> {
  try {
    await Purchases.purchasePackage(plan.pkg);
  } catch (e) {
    if (e && typeof e === "object" && "userCancelled" in e && e.userCancelled) return "cancelled";
    throw e;
  }
  const res = await api.action<{ premium: boolean }>("syncPurchases");
  return res.premium ? "premium" : "pending";
}

/** Restores purchases made with the same Apple / Google account. */
export async function restore(): Promise<boolean> {
  await Purchases.restorePurchases();
  const res = await api.action<{ premium: boolean }>("syncPurchases");
  return res.premium;
}
