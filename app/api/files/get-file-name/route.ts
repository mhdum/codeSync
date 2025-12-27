// app/api/files/get-file-name/route.ts
import { admin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
        return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    try {
        const docRef = admin.firestore().collection("project_files").doc(fileId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const data = docSnap.data();

        return NextResponse.json({
            file_name: data?.file_name,
            file_extension: data?.file_extension,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
