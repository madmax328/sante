import { useColorScheme } from "react-native";

/** Same palette as the website (apps/web/src/app/globals.css). */
const light = {
  basilic: "#1e6b52",
  basilicStrong: "#155440",
  basilicSoft: "#e3f0ea",
  abricot: "#ff8a5b",
  abricotSoft: "#ffe9df",
  onAbricot: "#2a1206",
  miel: "#e9a92f",
  mielSoft: "#fbf0d6",
  eau: "#3b8ed0",
  eauSoft: "#e2effa",
  riz: "#f4f6f2",
  surface: "#ffffff",
  encre: "#17201c",
  muted: "#5c6b64",
  line: "#dce3de",
  danger: "#c2413a",
  dangerSoft: "#fbe5e3",
};

const dark: typeof light = {
  basilic: "#4fbf95",
  basilicStrong: "#6fd2ab",
  basilicSoft: "#16302a",
  abricot: "#ff9c74",
  abricotSoft: "#3a2219",
  onAbricot: "#2a1206",
  miel: "#f2ba4e",
  mielSoft: "#352a12",
  eau: "#62a8e3",
  eauSoft: "#142b3d",
  riz: "#0f1513",
  surface: "#18201d",
  encre: "#eaf0ec",
  muted: "#9aaaa2",
  line: "#2a3531",
  danger: "#f07a72",
  dangerSoft: "#3a1c1a",
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

export const radius = { sm: 10, md: 16, lg: 22, full: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
