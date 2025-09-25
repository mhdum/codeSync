// app/api/project/get/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerid = url.searchParams.get("ownerid"); // client passes ?ownerid=email

    if (!ownerid) {
      return NextResponse.json({ message: "Missing ownerid" }, { status: 400 });
    }

    const projectsRef = collection(db, "projects");

    // Query for projects with ownerid equal to the provided value
    const q = query(projectsRef, where("ownerid", "==", ownerid));
    const querySnapshot = await getDocs(q);

    const projects: any[] = [];
    querySnapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error("Error fetching projects:", err);
    return NextResponse.json(
      { message: "Error fetching projects", error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
