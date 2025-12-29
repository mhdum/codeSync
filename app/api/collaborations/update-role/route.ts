import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const { projectId, editorEmail, senderEmail } = await req.json();

    if (!projectId || !editorEmail || !senderEmail)
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );

    // Fetch all invites by this user for this project
    const snap = await db
      .collection("collaborationInvites")
      .where("senderId", "==", senderEmail)
      .where("status", "==", "accepted")
      .get();

    const batch = db.batch();

    snap.forEach((doc) => {
      const data = doc.data();

      const updatedProjects = data.selectedProjects.map((proj: any) => {
        if (proj.project_id === projectId) {
          return {
            ...proj,
            role: data.email === editorEmail ? "editor" : "viewer",
          };
        }
        return proj;
      });

      batch.update(doc.ref, { selectedProjects: updatedProjects });
    });

    await batch.commit();

    return NextResponse.json({ message: "Role updated successfully" });
  } catch (err: any) {
    console.error("Role update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
