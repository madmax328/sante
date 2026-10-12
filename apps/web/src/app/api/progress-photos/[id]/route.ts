import { auth } from "@/lib/auth";
import { readProgressPhoto } from "@/lib/progress-photos";

export const dynamic = "force-dynamic";

/** A progress photo, decrypted for its owner only (website session or app session cookie). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const size = new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "full";
  const jpeg = await readProgressPhoto(session.user.id, id, size);
  if (!jpeg) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // Private to this browser or phone; the id never points to another image.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex",
    },
  });
}
