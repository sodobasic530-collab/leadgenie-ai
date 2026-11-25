import { NextRequest, NextResponse } from "next/server";
import { getLeadById, saveDraft } from "@/lib/leads";
import { draftColdEmail } from "@/lib/openai";
import { getUserFromRequest } from "@/lib/auth";
import { dailyDraftLimit, draftsUsedToday, recordDraft } from "@/lib/usage";
import { getOffer } from "@/lib/settings";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lead = await getLeadById(user.id, params.id);
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (lead.sent_at) {
    return NextResponse.json({ error: "already_sent" }, { status: 409 });
  }

  const offer = await getOffer(user.id);
  if (!offer) {
    return NextResponse.json({ error: "no_offer" }, { status: 400 });
  }

  const limit = dailyDraftLimit();
  const used = await draftsUsedToday(user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit_reached", limit }, { status: 429 });
  }

  await recordDraft(user.id);

  const result = await draftColdEmail(lead, offer);

  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  const updated = await saveDraft(user.id, lead.id, result.draft);
  return NextResponse.json(updated);
}
