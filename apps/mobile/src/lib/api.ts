import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { authClient } from "./auth";
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // The keychain may be unavailable (web preview): the request then goes without session.
  const cookie = await Promise.resolve(authClient.getCookie()).catch(() => "");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...init?.headers },
    // The session travels in the Cookie header above, not the platform cookie jar.
    credentials: "omit",
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(body.error ?? "server", res.status);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(`/api/mobile${path}`),
  /** Same actions as the website (see apps/web/src/app/api/mobile/action/route.ts). */
  action: async <T = { ok: boolean; error?: string }>(name: string, input?: unknown): Promise<T> => {
    const res = await request<{ result: T }>("/api/mobile/action", { method: "POST", body: JSON.stringify({ name, input }) });
    return res.result;
  },
};

/** Loads a screen's data, again each time the screen comes back into view. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "silent") => {
      if (!path) return;
      const id = ++latest.current;
      if (mode === "refresh") setRefreshing(true);
      try {
        const d = await api.get<T>(path);
        if (id === latest.current) {
          setData(d);
          setError(undefined);
        }
      } catch (e) {
        if (id === latest.current) setError(e instanceof ApiError ? e : new ApiError("network", 0));
      } finally {
        if (id === latest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path],
  );

  useFocusEffect(
    useCallback(() => {
      void load("silent");
    }, [load]),
  );

  return { data, error, loading, refreshing, reload: () => load("silent"), refresh: () => load("refresh"), setData };
}
