import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { currentAffiliate } from "@/lib/affiliate-auth";
import { getPayout } from "@/lib/affiliates";
import { payoutPdf } from "@/lib/affiliate-pdf";

export const dynamic = "force-dynamic";

/** The invoice or statement of a payout: for the admin, or the affiliate it belongs to. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payout = await getPayout(id);
  if (!payout) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await isAdmin())) {
    const a = await currentAffiliate();
    if (!a || a._id !== payout.affiliateId) return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const pdf = await payoutPdf(payout);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${payout.kind === "invoice" ? "facture" : "releve"}-${payout.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
