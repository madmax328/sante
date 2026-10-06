/** The Weeko website, which also serves the app's API. Override with EXPO_PUBLIC_API_URL while developing. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://getweeko.com").replace(/\/$/, "");
export const WEBSITE_URL = API_URL;
