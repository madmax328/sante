import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { BellRing, CalendarCheck, Droplet, Dumbbell, NotebookPen } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Switch, View } from "react-native";
import { Button, Card, Loading, Notice, Screen, SectionTitle, Segmented, T } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import {
  DEFAULT_REMINDERS,
  disableReminders,
  enableReminders,
  getReminderSettings,
  permissionState,
  saveReminderSettings,
  WORKOUT_TIMES,
  type ReminderSettings,
} from "@/lib/reminders";
import { space, useColors } from "@/lib/theme";

function Row({ icon, title, text, value, onChange, children }: { icon: ReactNode; title: string; text: string; value: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontWeight: "600" }}>{title}</T>
          <T variant="small">{text}</T>
        </View>
        <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ true: c.basilic }} />
      </View>
      {value && children}
    </View>
  );
}

/** Reminders: workouts, meals to log, water and the weekly review. */
export default function RemindersScreen() {
  const c = useColors();
  const { me } = useMe();
  const [settings, setSettings] = useState<ReminderSettings | null>();
  const [permission, setPermission] = useState<"allowed" | "denied" | "unknown">();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([getReminderSettings(), permissionState()]).then(([s, p]) => {
      setSettings(s);
      setPermission(p);
    });
  }, []);

  if (settings === undefined || !permission) return <Loading />;
  const on = !!settings && permission === "allowed";

  const turnOn = async () => {
    setBusy(true);
    const ok = await enableReminders(settings ?? DEFAULT_REMINDERS);
    setBusy(false);
    setPermission(await permissionState());
    if (ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSettings(await getReminderSettings());
    }
  };
  const turnOff = async () => {
    await disableReminders();
    setSettings(null);
  };
  const update = (patch: Partial<ReminderSettings>) => {
    const next = { ...(settings ?? DEFAULT_REMINDERS), ...patch };
    setSettings(next);
    void Haptics.selectionAsync();
    void saveReminderSettings(next);
  };

  return (
    <Screen padTop={false}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <BellRing size={28} color={c.basilic} />
          <View style={{ flex: 1 }}>
            <T variant="h2">{t("Rappels", "Reminders")}</T>
            <T variant="small">{t("Sorloo te prévient au bon moment, sans en faire trop.", "Sorloo nudges you at the right time, without overdoing it.")}</T>
          </View>
        </View>
        {permission === "denied" ? (
          <>
            <Notice>{t("Les notifications de Sorloo sont désactivées sur ce téléphone. Active-les dans Réglages → Sorloo → Notifications.", "Sorloo's notifications are turned off on this phone. Turn them on in Settings → Sorloo → Notifications.")}</Notice>
            <Button variant="secondary" onPress={() => Linking.openSettings()}>{t("Ouvrir les réglages", "Open settings")}</Button>
          </>
        ) : on ? (
          <Button variant="ghost" onPress={turnOff}>{t("Désactiver tous les rappels", "Turn off all reminders")}</Button>
        ) : (
          <Button loading={busy} onPress={turnOn}>{t("Activer les rappels", "Turn on reminders")}</Button>
        )}
        <T variant="small">{t("Un rappel est annulé dès que la chose est faite (séance cochée, repas noté, objectif d'eau atteint).", "A reminder is cancelled as soon as it's done (workout ticked, meal logged, water goal reached).")}</T>
      </Card>

      {on && settings && (
        <Card>
          <SectionTitle>{t("Quels rappels ?", "Which reminders?")}</SectionTitle>
          {me.sportEnabled && (
            <Row icon={<Dumbbell size={20} color={c.basilic} />} title={t("Séances de sport", "Workouts")} text={t("Les jours où une séance est prévue.", "On days with a planned workout.")} value={settings.workout} onChange={(v) => update({ workout: v })}>
              <Segmented options={WORKOUT_TIMES.map((k) => ({ key: k, label: k.replace(":", t("h", ":")).replace(/h00$/, "h") }))} value={settings.workoutTime as (typeof WORKOUT_TIMES)[number]} onChange={(k) => update({ workoutTime: k })} />
            </Row>
          )}
          <Row icon={<NotebookPen size={20} color={c.basilic} />} title={t("Journal des repas", "Meal journal")} text={t("Vers 13 h 45 et 20 h 45, si le repas n'est pas encore noté.", "Around 1:45 pm and 8:45 pm, if the meal isn't logged yet.")} value={settings.meals} onChange={(v) => update({ meals: v })} />
          <Row icon={<Droplet size={20} color={c.eau} />} title={t("Hydratation", "Hydration")} text={t("À 11 h et 16 h, tant que l'objectif d'eau n'est pas atteint.", "At 11 am and 4 pm, until the water goal is reached.")} value={settings.water} onChange={(v) => update({ water: v })} />
          <Row icon={<CalendarCheck size={20} color={c.basilic} />} title={t("Bilan et nouvelle semaine", "Review and new week")} text={t("Le dimanche à 18 h 30 : ton bilan, et ta semaine suivante à préparer.", "On Sunday at 6:30 pm: your review, and next week to prepare.")} value={settings.weekly} onChange={(v) => update({ weekly: v })} />
        </Card>
      )}
    </Screen>
  );
}
