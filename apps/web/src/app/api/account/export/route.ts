import { NextResponse } from "next/server";
import { exportAllData } from "@/lib/repo";
import { getSession } from "@/lib/session";

/** RGPD: full export of the user's data as a JSON download. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await exportAllData(session.user.id);
  const body = JSON.stringify({ account: { id: session.user.id, name: session.user.name, email: session.user.email, createdAt: session.user.createdAt }, ...data }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="weeko-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
