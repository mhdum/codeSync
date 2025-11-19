// app/api/changes/approve/route.ts
import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { proposalId, reviewerId, reviewerEmail } = await req.json();
        if (!proposalId) return NextResponse.json({ error: "proposalId required" }, { status: 400 });

        const propRef = adminDb.collection("proposals").doc(proposalId);
        const propSnap = await propRef.get();
        if (!propSnap.exists) return NextResponse.json({ error: "proposal not found" }, { status: 404 });

        const prop = propSnap.data() ?? {};
        const content = prop?.content ?? "";

        // Update the file content
        const fileRef = adminDb.collection("project_files").doc(prop.fileId);
        await fileRef.update({
            content,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark proposal approved
        await propRef.update({
            status: "approved",
            reviewedBy: reviewerId || reviewerEmail || "admin",
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify proposer
        await adminDb.collection("notifications").add({
            user: prop.proposerId || prop.proposerEmail || "unknown",
            type: "proposal_approved",
            proposalId,
            fileId: prop.fileId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("approve error", err);
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
