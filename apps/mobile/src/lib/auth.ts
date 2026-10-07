import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

/** Same accounts as the website. The session is kept in the device keychain. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "sorloo",
      // Kept from before the rename so testers stay signed in.
      storagePrefix: "weeko",
      storage: SecureStore,
    }),
  ],
});
