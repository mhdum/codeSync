// app/api/session/start/route.ts
import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { fileId, userId, userEmail } = await req.json();
        if (!fileId || !userId) return NextResponse.json({ error: "fileId & userId required" }, { status: 400 });

        const sessionRef = adminDb.collection("sessions").doc(fileId);
        await sessionRef.set({
            fileId,
            active: true,
            startedBy: userId,
            startedByEmail: userEmail || null,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("session/start error", err);
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
