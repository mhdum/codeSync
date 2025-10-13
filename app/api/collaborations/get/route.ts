// app/api/collaborations/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) return NextResponse.json({ projects: [] });

    const q = query(
      collection(db, "collaborationInvites"),
      where("status", "==", "accepted"),
      where("email", "==", email)
    );

    const snapshot = await getDocs(q);
    const collaboratedProjects: any[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (Array.isArray(data.selectedProjects)) {
        data.selectedProjects.forEach((proj: any) => {
          // normalize createdAt -> ISO string
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
            // ensure consistent keys used on frontend
            project_id: proj.project_id ?? proj.id ?? null,
            name: proj.name ?? proj.projectName ?? "Untitled",
            ownerId: proj.ownerid ?? data.senderId ?? null,
            inviteId: docSnap.id,
            createdAt: createdAtIso,
            // include raw proj if you want for debugging
            _raw: proj,
          });
        });
      }
    });

    return NextResponse.json({ projects: collaboratedProjects });
  } catch (error: any) {
    console.error("collaborations/get error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
