// app/api/changes/propose/route.ts
import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { fileId, proposerId, proposerEmail, content, originalContent } = await req.json();
        if (!fileId || content === undefined) {
            return NextResponse.json({ error: "fileId & content required" }, { status: 400 });
        }

        const finalProposerId = proposerId || proposerEmail || "unknown";

        // Try to find an existing PENDING proposal from same proposer for same file
        const existingQ = await adminDb
            .collection("proposals")
            .where("fileId", "==", fileId)
            .where("proposerId", "==", finalProposerId)
            .where("status", "==", "pending")
            .limit(1)
            .get();

        let docRef;
        const payload = {
            fileId,
            content,
            originalContent: originalContent || null,
            status: "pending",
            proposerId: finalProposerId,
            proposerEmail: proposerEmail || null,
            updatedAt: admin.firestore ? admin.firestore.FieldValue.serverTimestamp() : Date.now(),
            createdAt: admin.firestore ? admin.firestore.FieldValue.serverTimestamp() : Date.now(),
        };

        if (!existingQ.empty) {
            // update the existing pending proposal (dedupe)
            docRef = existingQ.docs[0].ref;
            await docRef.update({
                content: payload.content,
                originalContent: payload.originalContent,
                updatedAt: payload.updatedAt,
            });
        } else {
            // create new proposal
            docRef = adminDb.collection("proposals").doc();
            await docRef.set(payload);
            // notifications (optional)
            await adminDb.collection("notifications").add({
                user: payload.proposerId,
                type: "proposal_submitted",
                proposalId: docRef.id,
                fileId,
                createdAt: admin.firestore ? admin.firestore.FieldValue.serverTimestamp() : Date.now(),
                read: false,
            });
        }

        return NextResponse.json({ ok: true, id: docRef.id });
    } catch (err) {
        console.error("propose error", err);
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
