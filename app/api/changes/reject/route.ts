// app/api/changes/reject/route.ts
import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { proposalId, reviewerId, reviewerEmail, message } = await req.json();
        if (!proposalId) return NextResponse.json({ error: "proposalId required" }, { status: 400 });

        const propRef = adminDb.collection("proposals").doc(proposalId);
        const propSnap = await propRef.get();
        if (!propSnap.exists) return NextResponse.json({ error: "proposal not found" }, { status: 404 });

        const prop = propSnap.data() ?? {};

        await propRef.update({
            status: "rejected",
            reviewedBy: reviewerId || reviewerEmail || "admin",
            reviewedAt: admin.firestore ? admin.firestore.FieldValue.serverTimestamp() : Date.now(),
            responseMessage: message || null,
        });

        // Notify proposer
        await adminDb.collection("notifications").add({
            user: prop.proposerId || prop.proposerEmail || "unknown",
            type: "proposal_rejected",
            proposalId,
            fileId: prop.fileId,
            message: message || null,
            createdAt: admin.firestore ? admin.firestore.FieldValue.serverTimestamp() : Date.now(),
            read: false,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("reject error", err);
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
