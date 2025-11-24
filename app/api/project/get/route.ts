// api/get
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerid = url.searchParams.get("ownerid");

    if (!ownerid) {
      return NextResponse.json({ message: "Missing ownerid" }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection("projects")
      .where("ownerid", "==", ownerid)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ projects: [] }, { status: 200 });
    }

    const projects = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        project_id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      };
    });

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