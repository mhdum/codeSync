    import { admin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { projectId, userEmail } = await req.json();

    if (!projectId || !userEmail) {
      return NextResponse.json(
        { error: "Missing projectId or userEmail" },
        { status: 400 }
      );
    }

    const firestore = admin.firestore();

    let isAdmin = false;
    let isCollaborator = false;
    let role: "editor" | "viewer" | null = null;

    // 1) Check if user is the sender (project admin) for this project
    // Query invites where senderId == userEmail and status == 'accepted' (optional)
    const adminSnap = await firestore
      .collection("collaborationInvites")
      .where("senderId", "==", userEmail)
      .where("status", "==", "accepted")
      .get();

    if (!adminSnap.empty) {
      adminSnap.forEach((doc) => {
        const data: any = doc.data();
        const selectedProjects: any[] = Array.isArray(data.selectedProjects)
          ? data.selectedProjects
          : [];

        // If any selectedProjects entry matches this projectId -> user is admin for that project
        const match = selectedProjects.find(
          (p) => p && (p.project_id === projectId || p.projectId === projectId)
        );
        if (match) {
          isAdmin = true;
        }
      });
    }

    // 2) Check if user is a collaborator (invite recipient) for this project
    const collabSnap = await firestore
      .collection("collaborationInvites")
      .where("email", "==", userEmail)
      .where("status", "==", "accepted")
      .get();

    if (!collabSnap.empty) {
      collabSnap.forEach((doc) => {
        const data: any = doc.data();
        const selectedProjects: any[] = Array.isArray(data.selectedProjects)
          ? data.selectedProjects
          : [];

        const match = selectedProjects.find(
          (p) => p && (p.project_id === projectId || p.projectId === projectId)
        );

        if (match) {
          isCollaborator = true;
          // prefer explicit role if present
          if (match.role === "editor" || match.role === "viewer") {
            role = match.role;
          } else if (!role) {
            // default to viewer if nothing found yet
            role = "viewer";
          }
        }
      });
    }

    return NextResponse.json({
      isAdmin,
      isCollaborator,
      role,
    });
  } catch (err: any) {
    console.error("check-role error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}
