// app/api/invite/accept/route.ts
import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

const db = admin.firestore();

interface InviteData {
  email: string;
  selectedProjects: { projectId?: string; project_id?: string }[];
  status?: string;
  [key: string]: any;
}

export async function POST(req: Request) {
  try {
    const { inviteId, email } = await req.json();

    if (!inviteId || !email) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const inviteRef = db.collection("collaborationInvites").doc(inviteId);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const invite = inviteSnap.data() as InviteData; // ✅ Safe type assertion

    // ✅ Normalize both emails
    const inviteEmail = invite.email?.trim().toLowerCase();
    const userEmail = email.trim().toLowerCase();

    if (!inviteEmail) {
      return NextResponse.json(
        { error: "Invalid invitation: missing email field" },
        { status: 400 }
      );
    }

    // ✅ Allow only the intended user to accept
    if (inviteEmail !== userEmail) {
      return NextResponse.json(
        { error: `Unauthorized. This invite was sent to ${invite.email}` },
        { status: 403 }
      );
    }

    if (!Array.isArray(invite.selectedProjects) || invite.selectedProjects.length === 0) {
      return NextResponse.json({ error: "No projects in invitation" }, { status: 400 });
    }

    // ✅ Mark invitation as accepted
    await inviteRef.update({
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    });

    // ✅ Add collaborator to each project
    const batch = db.batch();
    for (const proj of invite.selectedProjects) {
      const projectId = proj.projectId || proj.project_id;
      if (!projectId) continue;
      const projectRef = db.collection("projects").doc(projectId);
      batch.update(projectRef, {
        collaborators: admin.firestore.FieldValue.arrayUnion(invite.email),
      });
    }
    await batch.commit();

    return NextResponse.json({ message: "Invitation accepted successfully" });
  } catch (error: any) {
    console.error("Invite accept error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
