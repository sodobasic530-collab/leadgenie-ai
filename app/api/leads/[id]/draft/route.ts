import { NextRequest, NextResponse } from "next/server";
import { getLeadById, saveDraft } from "@/lib/leads";
import { getUserFromRequest } from "@/lib/auth";

const MAX_SUBJECT = 150;
const MAX_BODY = 3000;

// Saves the user's edits to the stored draft. Send always uses what is stored here.
export async function PATCH(
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

  const body = await req.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (!subject || !text || subject.length > MAX_SUBJECT || text.length > MAX_BODY) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const updated = await saveDraft(user.id, lead.id, { subject, body: text });
  return NextResponse.json(updated);
}
