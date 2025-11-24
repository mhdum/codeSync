import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const userEmail = url.searchParams.get("userEmail");
        const projectId = url.searchParams.get("projectId");

        if (!userEmail || !projectId) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const doc = await adminDb.collection("completed_projects").doc(userEmail).get();

        if (!doc.exists) {
            return NextResponse.json({ completed: false }, { status: 200 });
        }

        const data = doc.data() ?? {};
        const found = data.projects?.some((p: any) => p.projectId === projectId);

        return NextResponse.json({ completed: found ?? false }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
