import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // <-- use admin SDK

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("API /api/project/create POST body:", body);

    const { name, ownerid } = body ?? {};
    if (!name || !ownerid) {
      console.log("Missing name or ownerid:", { name, ownerid });
      return NextResponse.json(
        { message: "Missing project name or ownerid" },
        { status: 400 }
      );
    }

    // Prepare project data
    const projectData = {
      name,
      ownerid,
      collaborators: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Creating project with data:", projectData);

    // Create a new project document with auto ID (Admin SDK version)
    const docRef = await adminDb.collection("projects").add(projectData);

    // Add the generated ID as a field in the same document
    await docRef.set({ project_id: docRef.id }, { merge: true });

    console.log("✅ Project created with ID:", docRef.id);

    return NextResponse.json(
      { message: "Project created", project_id: docRef.id },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Error creating project:", err);
    return NextResponse.json(
      {
        message: "Error creating project",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
