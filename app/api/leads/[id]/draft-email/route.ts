import { NextRequest, NextResponse } from "next/server";
import { getLeadById } from "@/lib/leads";
import { draftColdEmail } from "@/lib/openai";
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

  const result = await draftColdEmail(lead);

  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.draft);
}
