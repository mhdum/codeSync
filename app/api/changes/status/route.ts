// app/api/changes/status/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const proposalId = url.searchParams.get("proposalId");
        if (!proposalId) return NextResponse.json({ error: "proposalId required" }, { status: 400 });

        const snap = await adminDb.collection("proposals").doc(proposalId).get();
        if (!snap.exists) return NextResponse.json({ error: "not found" }, { status: 404 });

        return NextResponse.json({ id: snap.id, ...snap.data() });
    } catch (err) {
        console.error("proposal status error", err);
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
