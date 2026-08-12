import { NextRequest, NextResponse } from "next/server";
import { getLeadById, markLeadSent } from "@/lib/leads";
import { sendEmail } from "@/lib/resend";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lead = await getLeadById(params.id);
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json();
  const subject = body.subject?.trim();
  const emailBody = body.body?.trim();

  if (!subject || !emailBody) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await sendEmail({ to: lead.email, subject, body: emailBody });

  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  const updatedLead = await markLeadSent(lead.id);
  return NextResponse.json(updatedLead);
}
