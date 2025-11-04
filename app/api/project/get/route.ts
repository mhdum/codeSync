import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // use Admin SDK

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerid = url.searchParams.get("ownerid"); // e.g. ?ownerid=email

    if (!ownerid) {
      return NextResponse.json({ message: "Missing ownerid" }, { status: 400 });
    }

    // Query Firestore using the Admin SDK
    const snapshot = await adminDb
      .collection("projects")
      .where("ownerid", "==", ownerid)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ projects: [] }, { status: 200 });
    }

    // Map documents into array
    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ projects }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Error fetching projects:", err);
    return NextResponse.json(
      {
        message: "Error fetching projects",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
