import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";


export const dynamic = "force-dynamic";
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json({ error: "projectId missing" }, { status: 400 });
        }

        const snap = await adminDb
            .collection("project_files")
            .where("project_id", "==", projectId)
            .get();

        const files = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ files }, { status: 200 });
    } catch (error) {
        console.error("Error fetching files:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
