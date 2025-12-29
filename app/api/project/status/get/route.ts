import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const userEmail = url.searchParams.get("userEmail");  // may be null for collaborator
        const projectId = url.searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
        }

        // ----------------------------------------------------
        // CASE 1 → ADMIN SIDE (userEmail is provided)
        // ----------------------------------------------------
        if (userEmail) {
            const doc = await adminDb.collection("completed_projects").doc(userEmail).get();

            if (!doc.exists) {
                return NextResponse.json({ completed: false }, { status: 200 });
            }

            const data = doc.data() ?? {};
            const found = data.projects?.some((p: any) => p.projectId === projectId);

            return NextResponse.json({ completed: found ?? false }, { status: 200 });
        }

        // ----------------------------------------------------
        // CASE 2 → COLLABORATOR SIDE (userEmail missing)
        // Only check by projectId across ALL users
        // ----------------------------------------------------
        const snapshot = await adminDb.collection("completed_projects").get();

        let projectFound = false;

        snapshot.forEach((doc: any) => {
            const data = doc.data() ?? {};
            if (data.projects?.some((p: any) => p.projectId === projectId)) {
                projectFound = true;
            }
        });

        return NextResponse.json({ completed: projectFound }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
