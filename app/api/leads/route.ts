import { NextRequest, NextResponse } from "next/server";
import { addLead, listLeads } from "@/lib/leads";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const leads = await listLeads();
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = await addLead(body);

  if (!result.ok) {
    const status = result.error === "duplicate" ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.lead, { status: 201 });
}
