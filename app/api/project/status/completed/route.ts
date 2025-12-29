import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { userEmail } = await req.json();

        if (!userEmail) {
            return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
        }

        // 1️⃣ FETCH COMPLETED PROJECTS
        const completedRef = adminDb.collection("completed_projects").doc(userEmail);
        const completedSnap = await completedRef.get();

        let completedProjects: any[] = [];
        let completedProjectIds: string[] = [];

        if (completedSnap.exists) {
            const data = completedSnap.data() || {};   // <-- FIX
            completedProjects = data.projects ?? [];
            completedProjectIds = completedProjects.map((p: any) => p.projectId);
        }

        // 2️⃣ FETCH ALL PROJECTS
        const snapshot = await adminDb
            .collection("projects")
            .where("ownerid", "==", userEmail)
            .get();

        const allUserProjects: any[] = [];
        snapshot.forEach((doc) => {
            allUserProjects.push({
                project_id: doc.id,
                ...doc.data(),
            });
        });

        // 3️⃣ SPLIT
        const nonCompletedProjects = allUserProjects.filter(
            (p) => !completedProjectIds.includes(p.project_id)
        );

        const formattedCompleted = completedProjects.map((p) => ({
            projectId: p.projectId,
            projectTitle: p.projectTitle,
            completedAt: p.completedAt?.toDate?.() ?? null,
        }));

        // 4️⃣ RETURN
        return NextResponse.json({
            completed: formattedCompleted,
            nonCompleted: nonCompletedProjects,
        });

    } catch (err: any) {
        console.error("❌ Error:", err);
        return NextResponse.json(
            {
                error: "Server error",
                details: err?.message || String(err),
            },
            { status: 500 }
        );
    }
}
