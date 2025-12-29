import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { fileId } = await req.json();

        if (!fileId) {
            return NextResponse.json(
                { error: "fileId is required" },
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

        await ref.delete();

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Delete file error:", err);
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500 }
        );
    }
}
