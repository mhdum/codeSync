// app/api/session/end/route.ts
import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { fileId, userId } = await req.json();
        if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

        const sessionRef = adminDb.collection("sessions").doc(fileId);
        await sessionRef.set({
            active: false,
            endedBy: userId || null,
            endedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("session/end error", err);
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
