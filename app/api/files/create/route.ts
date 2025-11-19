import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { projectId, fileName, fileExtension, userEmail } = await req.json();

        if (!projectId || !fileName || !fileExtension) {
            return NextResponse.json(
                { error: "Missing fields" },
                { status: 400 }
            );
        }

        const docRef = await adminDb.collection("project_files").add({
            project_id: projectId,
            file_name: fileName,
            file_extension: fileExtension,
            createdBy: userEmail,
            content: "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ id: docRef.id }, { status: 200 });
    } catch (error) {
        console.error("Error creating file:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
