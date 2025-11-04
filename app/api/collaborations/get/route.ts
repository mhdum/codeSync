import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) return NextResponse.json({ projects: [] });

    // 1️⃣ Query accepted collaboration invites for this email
    const snapshot = await adminDb
      .collection("collaborationInvites")
      .where("status", "==", "accepted")
      .where("email", "==", email)
      .get();

    const collaboratedProjects: any[] = [];

    // 2️⃣ Loop through all invites and extract projects
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (Array.isArray(data.selectedProjects)) {
        data.selectedProjects.forEach((proj: any) => {
          // Normalize createdAt to ISO string
          let createdAtIso: string | null = null;
          if (proj.createdAt?.seconds) {
            createdAtIso = new Date(proj.createdAt.seconds * 1000).toISOString();
          } else if (typeof proj.createdAt === "string") {
            createdAtIso = proj.createdAt;
          } else if (proj.createdAt instanceof Date) {
            createdAtIso = proj.createdAt.toISOString();
          } else {
            createdAtIso = new Date().toISOString();
          }

          collaboratedProjects.push({
            project_id: proj.project_id ?? proj.id ?? null,
            name: proj.name ?? proj.projectName ?? "Untitled",
            ownerId: proj.ownerid ?? data.senderId ?? null,
            inviteId: docSnap.id,
            createdAt: createdAtIso,
            _raw: proj,
          });
        });
      }
    });

    // 3️⃣ Return result
    return NextResponse.json({ projects: collaboratedProjects });
  } catch (error: any) {
    console.error("🔥 collaborations/get error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch collaborations" },
      { status: 500 }
    );
  }
}
