import { NextRequest, NextResponse } from "next/server";
import { addLead, listLeads } from "@/lib/leads";
import { getUserFromRequest, isDemoUser } from "@/lib/auth";
import { dailyDraftLimit, draftsUsedToday } from "@/lib/usage";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [leads, used] = await Promise.all([
    listLeads(user.id),
    draftsUsedToday(user.id),
  ]);

  return NextResponse.json({
    leads,
    me: {
      email: user.email,
      isDemo: isDemoUser(user),
      draftsUsed: used,
      draftLimit: dailyDraftLimit(),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await addLead(user.id, body);

  if (!result.ok) {
    const status = result.error === "duplicate" ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.lead, { status: 201 });
}
