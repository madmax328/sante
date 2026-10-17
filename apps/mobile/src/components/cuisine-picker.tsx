import { CUISINE_COUNTRIES } from "@weeko/catalog/countries";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip, T } from "@/components/ui";
import { api } from "@/lib/api";
import { lang, t } from "@/lib/i18n";
import { radius, space, useColors } from "@/lib/theme";

/** Lunches and dinners from one or more countries; none selected = a mix of every cuisine. */
function CuisineSheet({ redo, onClose }: { redo: boolean; onClose: (cuisines: string[] | null) => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState<string[]>([]);
  const touched = useRef(false);
  useEffect(() => {
    // Preselect the countries of the last week, unless a choice was already made.
    api
      .action<{ cuisines: string[] }>("cuisines")
      .then((r) => {
        if (!touched.current) setValue(r.cuisines ?? []);
      })
      .catch(() => undefined);
  }, []);
  const choose = (v: string[]) => {
    touched.current = true;
    setValue(v);
  };
  const toggle = (code: string) => choose(value.includes(code) ? value.filter((x) => x !== code) : [...value, code]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => onClose(null)}>
      <Pressable accessibilityLabel={t("Fermer", "Close")} onPress={() => onClose(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
      <View style={{ backgroundColor: c.riz, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, paddingBottom: space.lg + insets.bottom, gap: space.md, maxHeight: "85%" }}>
        <T variant="h2">{t("Quelles cuisines cette semaine ?", "Which cuisines this week?")}</T>
        <T variant="small">
          {t(
            "Choisis un ou plusieurs pays pour les déjeuners et les dîners, ou garde le mélange. Les petits-déjeuners et les collations ne changent pas.",
            "Pick one or more countries for lunches and dinners, or keep the mix. Breakfasts and snacks stay the same.",
          )}
        </T>
        <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <Chip label={`🌍 ${t("Mélange", "Mix")}`} active={value.length === 0} onPress={() => choose([])} />
          {CUISINE_COUNTRIES.map((country) => (
            <Chip key={country.code} label={`${country.flag} ${country.name[lang]}`} active={value.includes(country.code)} onPress={() => toggle(country.code)} />
          ))}
        </ScrollView>
        {redo && <T variant="small">{t("Tout le menu sera recréé (les repas à l'extérieur sont conservés).", "The whole menu will be recreated (meals eaten out are kept).")}</T>}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button variant="ghost" onPress={() => onClose(null)} style={{ flex: 1 }}>{t("Annuler", "Cancel")}</Button>
          <Button variant="accent" onPress={() => onClose(value)} style={{ flex: 2 }}>{redo ? t("Recréer", "Recreate") : t("Créer ma semaine", "Create my week")}</Button>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Asks for the countries of the week before creating it: `ask()` resolves
 * with the codes chosen ([] = mix), or null when cancelled. Render `sheet`.
 */
export function useCuisineChoice() {
  const [request, setRequest] = useState<{ redo: boolean; resolve: (v: string[] | null) => void }>();
  const ask = (redo = false) => new Promise<string[] | null>((resolve) => setRequest({ redo, resolve }));
  const sheet = request ? (
    <CuisineSheet
      redo={request.redo}
      onClose={(v) => {
        request.resolve(v);
        setRequest(undefined);
      }}
    />
  ) : null;
  return { ask, sheet };
}
