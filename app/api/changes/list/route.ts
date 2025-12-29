// app/api/changes/list/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

    const snap = await adminDb
      .collection("proposals")
      .where("fileId", "==", fileId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .get();

    const proposals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ proposals });
  } catch (err) {
    console.error("changes/list error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
