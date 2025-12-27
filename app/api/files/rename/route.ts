import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { fileId, newFileName } = await req.json();

        if (!fileId || !newFileName) {
            return NextResponse.json(
                { error: "fileId and newFileName are required" },
                { status: 400 }
            );
        }

        const ref = adminDb.collection("project_files").doc(fileId);

        const snap = await ref.get();
        if (!snap.exists) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }

        await ref.update({
            file_name: newFileName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Rename file error:", err);
        return NextResponse.json(
            { error: "Failed to rename file" },
            { status: 500 }
        );
    }
}
