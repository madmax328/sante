import { lang } from "./i18n";

/** The Sorloo website, which also serves the app's API. Override with EXPO_PUBLIC_API_URL while developing. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://sorloo.com").replace(/\/$/, "");
export const WEBSITE_URL = API_URL;

/** A website page in the app's language ("/en/…", "/de/…"; French at the root). */
export const sitePage = (path: string) => `${WEBSITE_URL}${lang === "fr" ? "" : `/${lang}`}${path}`;
