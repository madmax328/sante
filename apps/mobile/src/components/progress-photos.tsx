import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Camera, ImageIcon, Lock, Trash2, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Notice, SectionTitle, T } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { longDate, shortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { makeThumb, pickPhoto } from "@/lib/photo";
import { radius, space, useColors } from "@/lib/theme";

interface ProgressPhoto {
  id: string;
  date: string;
  width: number;
  height: number;
}

type AddResult = { ok: true; photo: ProgressPhoto } | { ok: false; error: "invalid" | "too_big" | "limit" };

/** The photos are private: the image request carries the session, like the API. */
function usePhotoSource() {
  const [cookie, setCookie] = useState<string>();
  useEffect(() => {
    void Promise.resolve(authClient.getCookie())
      .then((c) => setCookie(c ?? ""))
      .catch(() => setCookie(""));
  }, []);
  return useCallback(
    (p: ProgressPhoto, size: "thumb" | "full") => ({ uri: `${API_URL}/api/progress-photos/${p.id}?size=${size}`, headers: cookie ? { Cookie: cookie } : undefined, cacheKey: `progress-${p.id}-${size}` }),
    [cookie],
  );
}

function Thumb({ photo, source, onPress, label }: { photo: ProgressPhoto; source: ReturnType<typeof usePhotoSource>; onPress: () => void; label?: string }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel={t("Photo du {0}", "Photo from {0}", [longDate(photo.date)])} onPress={onPress} style={{ flex: 1, gap: 4 }}>
      <Image source={source(photo, "thumb")} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: c.riz }} contentFit="cover" cachePolicy="disk" />
      <T variant="small" style={{ textAlign: "center" }}>{label ? `${label} · ${shortDate(photo.date)}` : shortDate(photo.date)}</T>
    </Pressable>
  );
}

/** Optional progress photos: private, encrypted, visible only to the person. */
export function ProgressPhotos({ today }: { today: string }) {
  const c = useColors();
  const source = usePhotoSource();
  const [photos, setPhotos] = useState<ProgressPhoto[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState<ProgressPhoto | null>(null);

  const load = useCallback(async () => {
    const list = await api.action<ProgressPhoto[]>("progressPhotos").catch(() => null);
    if (list) setPhotos(list);
  }, []);
  useEffect(() => {
    let live = true;
    api.action<ProgressPhoto[]>("progressPhotos").then((list) => live && list && setPhotos(list), () => undefined);
    return () => {
      live = false;
    };
  }, []);

  const add = async (from: "camera" | "library") => {
    setError(undefined);
    const photo = await pickPhoto(from, 1080).catch(() => null);
    if (!photo) return;
    setBusy(true);
    try {
      const thumb = await makeThumb(photo.uri);
      if (!thumb) throw new Error("thumb");
      const res = await api.action<AddResult>("addProgressPhoto", { date: today, full: photo.base64, thumb, width: photo.width, height: photo.height });
      if (!res.ok) {
        setError(res.error === "limit" ? t("Tu as atteint 100 photos. Supprime-en une pour en ajouter une nouvelle.", "You've reached 100 photos. Delete one to add a new one.") : t("Cette photo n'a pas pu être enregistrée. Essaie avec une autre.", "This photo couldn't be saved. Try another one."));
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await load();
      }
    } catch {
      setError(t("L'envoi a échoué. Vérifie ta connexion et réessaie.", "Upload failed. Check your connection and try again."));
    }
    setBusy(false);
  };

  const remove = (p: ProgressPhoto) =>
    Alert.alert(t("Supprimer cette photo ?", "Delete this photo?"), longDate(p.date), [
      { text: t("Annuler", "Cancel"), style: "cancel" },
      {
        text: t("Supprimer", "Delete"),
        style: "destructive",
        onPress: async () => {
          setOpen(null);
          setPhotos((list) => list?.filter((x) => x.id !== p.id));
          await api.action("deleteProgressPhoto", { id: p.id }).catch(() => undefined);
          await load();
        },
      },
    ]);

  const list = photos ?? [];
  const first = list[list.length - 1];
  const last = list[0];

  return (
    <Card>
      <SectionTitle>{t("Photos de progression", "Progress photos")}</SectionTitle>
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
        <Lock size={16} color={c.muted} style={{ marginTop: 2 }} />
        <T variant="small" style={{ flex: 1 }}>{t("Facultatives et privées : elles sont chiffrées et visibles uniquement par toi. Une photo par semaine, même endroit, même lumière, suffit pour voir l'évolution.", "Optional and private: they're encrypted and only you can see them. One photo a week, same place, same light, is enough to see the change.")}</T>
      </View>

      {photos === undefined ? (
        <ActivityIndicator color={c.basilic} />
      ) : list.length >= 2 && first && last ? (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Thumb photo={first} source={source} label={t("Avant", "Before")} onPress={() => setOpen(first)} />
          <Thumb photo={last} source={source} label={t("Maintenant", "Now")} onPress={() => setOpen(last)} />
        </View>
      ) : null}

      {list.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {list.slice(0, 24).map((p) => (
            <Pressable key={p.id} accessibilityRole="imagebutton" accessibilityLabel={t("Photo du {0}", "Photo from {0}", [longDate(p.date)])} onPress={() => setOpen(p)} style={{ width: "23%" }}>
              <Image source={source(p, "thumb")} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: radius.sm, backgroundColor: c.riz }} contentFit="cover" cachePolicy="disk" />
            </Pressable>
          ))}
        </View>
      )}

      {error && <Notice tone="danger">{error}</Notice>}
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button style={{ flex: 1 }} variant="secondary" loading={busy} icon={<Camera size={18} color={c.encre} />} onPress={() => add("camera")}>{t("Prendre une photo", "Take a photo")}</Button>
        <Button variant="secondary" disabled={busy} icon={<ImageIcon size={18} color={c.encre} />} accessibilityLabel={t("Choisir dans mes photos", "Choose from my photos")} onPress={() => add("library")} />
      </View>

      <Modal visible={!!open} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setOpen(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          {open && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", padding: space.md, gap: space.md }}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("Fermer", "Close")} hitSlop={10} onPress={() => setOpen(null)}>
                  <X size={24} color="#fff" />
                </Pressable>
                <T style={{ flex: 1, color: "#fff", fontWeight: "600", textAlign: "center" }}>{longDate(open.date)}</T>
                <Pressable accessibilityRole="button" accessibilityLabel={t("Supprimer cette photo", "Delete this photo")} hitSlop={10} onPress={() => remove(open)}>
                  <Trash2 size={22} color="#fff" />
                </Pressable>
              </View>
              <Image source={source(open, "full")} placeholder={source(open, "thumb")} style={{ flex: 1 }} contentFit="contain" cachePolicy="disk" />
            </>
          )}
        </SafeAreaView>
      </Modal>
    </Card>
  );
}
