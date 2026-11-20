import { NextRequest, NextResponse } from "next/server";
import { getLeadById, markLeadSent } from "@/lib/leads";
import { sendEmail } from "@/lib/resend";
import { getUserFromRequest, isDemoUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isDemoUser(user)) {
    return NextResponse.json({ error: "demo_cannot_send" }, { status: 403 });
  }

  const lead = await getLeadById(user.id, params.id);
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (lead.sent_at) {
    return NextResponse.json({ error: "already_sent" }, { status: 409 });
  }

  // Only the draft stored on the server can be sent, never text from the browser
  if (!lead.draft_subject || !lead.draft_body) {
    return NextResponse.json({ error: "no_draft" }, { status: 400 });
  }

  const result = await sendEmail({
    to: lead.email,
    subject: lead.draft_subject,
    body: lead.draft_body,
  });

  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  const updatedLead = await markLeadSent(user.id, lead.id);
  return NextResponse.json(updatedLead);
}
