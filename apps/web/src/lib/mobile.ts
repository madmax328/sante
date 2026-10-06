import "server-only";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { UnauthorizedError } from "./session";
import { NoProfileError } from "./week-service";

/**
 * JSON API for the iOS / Android apps. The app sends the Better Auth session
 * cookie (expo plugin), so the same session checks as the website apply.
 */
export function mobileRoute<T>(handler: (req: Request, userId: string) => Promise<T>) {
  return async (req: Request): Promise<Response> => {
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      const data = await handler(req, session.user.id);
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      if (e instanceof NoProfileError) return NextResponse.json({ error: "no_profile" }, { status: 409 });
      if (e instanceof MobileError) return NextResponse.json({ error: e.code }, { status: e.status });
      console.error("[mobile api]", e);
      return NextResponse.json({ error: "server" }, { status: 500 });
    }
  };
}

export class MobileError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
  ) {
    super(code);
  }
}
