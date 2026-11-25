import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, isDemoUser } from "@/lib/auth";
import { saveOffer } from "@/lib/settings";

export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // The demo login is shared, so one visitor can't change it for everyone
  if (isDemoUser(user)) {
    return NextResponse.json({ error: "demo_cannot_edit_offer" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const offer = await saveOffer(user.id, body.offer);
  return NextResponse.json({ offer });
}
