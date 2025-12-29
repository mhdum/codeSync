import { adminDb, admin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: any) {
    try {
        const fileId = params.fileId;
        const ref = adminDb.collection("project_files").doc(fileId);
        const snap = await ref.get();

        if (!snap.exists) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        return NextResponse.json(snap.data());
    } catch (error) {
        console.error("GET file error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}


export async function PUT(req: Request, { params }: any) {
    try {
        const fileId = params.fileId;
        const { content } = await req.json();

        const ref = adminDb.collection("project_files").doc(fileId);

        await ref.update({
            content,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("UPDATE file error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
