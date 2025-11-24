import { NextResponse } from "next/server";
import { admin, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { project_id, collaboratorsToRemove } = await req.json();

        if (!project_id || !collaboratorsToRemove?.length)
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });

        const projectRef = adminDb.collection("projects").doc(project_id);

        // 1️⃣ Remove collaborators from project
        await projectRef.update({
            collaborators: admin.firestore.FieldValue.arrayRemove(...collaboratorsToRemove)
        });

        // 2️⃣ Delete documents in collaborationInvites IF project exists inside selectedProjects
        const invitesRef = adminDb.collection("collaborationInvites");

        for (const email of collaboratorsToRemove) {
            const snapshot = await invitesRef.where("email", "==", email).get();

            if (snapshot.empty) continue;

            snapshot.forEach(async (doc) => {
                const data = doc.data();

                if (!Array.isArray(data.selectedProjects)) return;

                const hasProject = data.selectedProjects.some(
                    (item: any) => item.project_id === project_id
                );

                if (hasProject) {
                    // 🔥 DELETE THE WHOLE DOCUMENT
                    await doc.ref.delete();
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("Remove collaborator error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
