import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Button, Card, Chip, ErrorView, Loading, Notice, Screen, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { DAY_LABEL } from "@/lib/format";
import { L } from "@/lib/labels";
import { space, useColors } from "@/lib/theme";
import type { SportSettings } from "./(tabs)/sport";

const EQUIPMENT: Record<string, string> = { mat: "Tapis", ...L.sportEquipment };
const MINUTES = [15, 20, 30, 45, 60];

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label">{label}</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>{children}</View>
    </View>
  );
}

const toggle = <K,>(list: K[], k: K) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

export default function SportSettingsScreen() {
  const c = useColors();
  const { data, error, loading, reload } = useApi<{ allowed: boolean; settings: SportSettings }>("/sport");
  const [s, setS] = useState<SportSettings>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (data && !s) setS(data.settings);
  }, [data, s]);

  if (loading && !data) return <Loading />;
  if (!data || !s) return <ErrorView message="Le chargement a échoué." onRetry={reload} />;

  const save = async () => {
    setBusy(true);
    setFailed(false);
    const equipment = s.equipment.filter((e) => e !== "none");
    const res = await api.action<{ ok: boolean }>("saveSportSettings", { ...s, equipment: equipment.length ? equipment : ["none"] }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFailed(true);
    router.back();
  };

  return (
    <Screen padTop={false}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <T variant="h3">Programme sportif</T>
            <T variant="small">Des séances préparées chaque semaine.</T>
          </View>
          <Switch value={s.enabled} onValueChange={(enabled) => setS({ ...s, enabled })} trackColor={{ true: c.basilic }} accessibilityLabel="Activer le programme sportif" />
        </View>
      </Card>
      {s.enabled && (
        <Card>
          <Group label="Niveau">
            {(Object.keys(L.level) as SportSettings["level"][]).map((k) => (
              <Chip key={k} label={L.level[k]} active={s.level === k} onPress={() => setS({ ...s, level: k })} />
            ))}
          </Group>
          <Group label="Jours disponibles">
            {DAY_LABEL.map((d, i) => (
              <Chip key={d} label={d.slice(0, 3)} active={s.availableDays.includes(i)} onPress={() => setS({ ...s, availableDays: toggle(s.availableDays, i).sort() })} />
            ))}
          </Group>
          <Group label="Durée d'une séance">
            {MINUTES.map((m) => (
              <Chip key={m} label={`${m} min`} active={s.minutesPerSession === m} onPress={() => setS({ ...s, minutesPerSession: m })} />
            ))}
          </Group>
          <Group label="Matériel">
            {Object.entries(EQUIPMENT).map(([k, label]) => (
              <Chip key={k} label={label} active={s.equipment.includes(k)} onPress={() => setS({ ...s, equipment: toggle(s.equipment, k) })} />
            ))}
          </Group>
          <Group label="Douleurs ou fragilités">
            {Object.entries(L.limitation).map(([k, label]) => (
              <Chip key={k} label={label} active={s.limitations.includes(k)} onPress={() => setS({ ...s, limitations: toggle(s.limitations, k) })} />
            ))}
          </Group>
          <T variant="small">Les exercices qui sollicitent une zone fragile sont remplacés.</T>
        </Card>
      )}
      {failed && <Notice tone="danger">L'enregistrement a échoué. Choisis au moins un jour et réessaie.</Notice>}
      <Button onPress={save} loading={busy}>Enregistrer</Button>
    </Screen>
  );
}
