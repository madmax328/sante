import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { purchasesAvailable } from "@/lib/purchases";
import { useColors } from "@/lib/theme";

/** Opens the subscription screen (hidden for Premium users or where purchases aren't possible). */
export function PremiumButton({ label }: { label?: string }) {
  const c = useColors();
  const { me } = useMe();
  if (me.premium || !purchasesAvailable()) return null;
  return (
    <Button variant="accent" small style={{ alignSelf: "flex-start" }} icon={<Sparkles size={16} color={c.onAbricot} />} onPress={() => router.push("/premium")}>
      {label ?? t("Découvrir Premium", "Discover Premium")}
    </Button>
  );
}
