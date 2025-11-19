import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

const db = admin.firestore();

export async function GET(req: Request, { params }: any) {
  try {
    const { projectId } = params;
    const senderEmail = req.headers.get("x-user-email"); // Send from FE

    if (!senderEmail)
      return NextResponse.json({ error: "Missing user email" }, { status: 400 });

    // Fetch all invites sent by this user
    const snap = await db
      .collection("collaborationInvites")
      .where("senderId", "==", senderEmail)
      .where("status", "==", "accepted")
      .get();

    const collaborators: any[] = [];

    snap.forEach((doc) => {
      const data = doc.data();

      data.selectedProjects.forEach((proj: any) => {
        if (proj.project_id === projectId) {
          collaborators.push({
            inviteId: doc.id,
            email: data.email,
            role: proj.role || "viewer",
            project_id: proj.project_id,
          });
        }
      });
    });

    return NextResponse.json({ collaborators });
  } catch (err: any) {
    console.error("Error fetching collaborators:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
