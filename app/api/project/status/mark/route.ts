import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { userEmail, projectId, projectTitle } = await req.json();

    if (!userEmail || !projectId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const docRef = adminDb
      .collection("completed_projects")
      .doc(userEmail);

    // Save under array or sub-collection
    await docRef.set(
      {
        projects: admin.firestore.FieldValue.arrayUnion({
          projectId,
          projectTitle,
          completedAt: new Date(),
        }),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("ERROR marking project completed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
