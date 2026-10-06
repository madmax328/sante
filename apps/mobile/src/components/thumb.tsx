import { Image } from "expo-image";
import { View } from "react-native";
import { radius, useColors } from "@/lib/theme";

/** Recipe photo, or a soft placeholder while photos are being collected. */
export function Thumb({ uri, size = 60 }: { uri: string | null; size?: number }) {
  const c = useColors();
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.md }} contentFit="cover" transition={150} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: c.basilicSoft }} />
  );
}
