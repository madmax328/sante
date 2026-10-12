import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";
import { t } from "./i18n";

export interface Photo {
  /** Local file, for display */
  uri: string;
  /** JPEG, without the "data:" prefix */
  base64: string;
  width: number;
  height: number;
}

/**
 * Takes or picks a photo and shrinks it (longest side `maxSide`, JPEG): small
 * enough to send quickly, sharp enough to see the plate or the silhouette.
 * Null when cancelled or not allowed.
 */
export async function pickPhoto(source: "camera" | "library", maxSide = 1280): Promise<Photo | null> {
  if (source === "camera") {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) {
      Alert.alert(t("Appareil photo non autorisé", "Camera not allowed"), t("Autorise l'appareil photo pour Sorloo dans les réglages de ton téléphone.", "Allow camera access for Sorloo in your phone's settings."), [
        { text: t("Annuler", "Cancel"), style: "cancel" },
        { text: t("Réglages", "Settings"), onPress: () => void Linking.openSettings() },
      ]);
      return null;
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.9, exif: false };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  const landscape = asset.width >= asset.height;
  const big = Math.max(asset.width, asset.height) > maxSide;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (big) ctx.resize(landscape ? { width: maxSide } : { height: maxSide });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  if (!out.base64) return null;
  return { uri: out.uri, base64: out.base64, width: out.width, height: out.height };
}

/** A small copy (longest side `side`) for grids. */
export async function makeThumb(uri: string, side = 360): Promise<string | null> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: side });
  const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return out.base64 ?? null;
}
