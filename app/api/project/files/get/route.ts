// api/get  (or name it api/projects/with-files)
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerid = url.searchParams.get("ownerid");

    if (!ownerid) {
      return NextResponse.json(
        { message: "Missing ownerid" },
        { status: 400 }
      );
    }

    // Step 1: Fetch all projects for this owner
    const projectsSnapshot = await adminDb
      .collection("projects")
      .where("ownerid", "==", ownerid)
      .get();

    if (projectsSnapshot.empty) {
      return NextResponse.json({ projects: [] }, { status: 200 });
    }

    const projects = [];
    const projectIds = projectsSnapshot.docs.map((doc) => doc.id);

    // Step 2: Fetch all files for these project IDs in one batched query
    const filesSnapshot = await adminDb
      .collection("project_files")
      .where("project_id", "in", projectIds) // Efficiently get all files for these projects
      .get();

    // Group files by project_id
    const filesByProjectId: Record<string, any[]> = {};
    filesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const pid = data.project_id;

      if (!filesByProjectId[pid]) {
        filesByProjectId[pid] = [];
      }

      filesByProjectId[pid].push({
        file_id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      });
    });

    // Step 3: Build final projects array with nested files
    for (const doc of projectsSnapshot.docs) {
      const data = doc.data();

      projects.push({
        project_id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
        files: filesByProjectId[doc.id] || [], // Attach files (empty array if none)
      });
    }

    console.log(projects)

    return NextResponse.json({ projects }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching projects with files:", err);
    return NextResponse.json(
      {
        message: "Error fetching projects with files",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}