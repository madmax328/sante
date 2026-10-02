import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

/** Current session (memoised per request). */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** For server actions and route handlers: the signed-in user id or an error. */
export async function requireUserId(): Promise<string> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s.user.id;
}
