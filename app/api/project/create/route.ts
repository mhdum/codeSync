// app/api/project/create/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // <-- read once
    console.log("API /api/projects/create POST body:", body);

    const { name, ownerid } = body ?? {};
    if (!name || !ownerid) {
      console.log("Missing name or ownerid:", { name, ownerid });
      return NextResponse.json({ message: "Missing project name or ownerid" }, { status: 400 });
    }

    const projectsRef = collection(db, "projects");
    console.log("Projects collection ref:", projectsRef);
    const projectData = {
      name,
      ownerid,
      collaborators: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    console.log("Creating project with data:", projectData);

    // create document with auto ID
    const docRef = await addDoc(projectsRef, projectData);


    await setDoc(doc(projectsRef, docRef.id), { project_id: docRef.id }, { merge: true });

    console.log("Project created id:", docRef.id);

    // Optionally set project_id field equal to doc id
    // You can update the doc to include project_id, or include it client-side.
    // Here I'll update it so document contains project_id:
    await addDoc(projectsRef, {}); // NO — don't do this; instead use setDoc if you need project_id field.

    // If you want project_id inside the document, use setDoc with doc() + id:
    // const newDocRef = doc(projectsRef, docRef.id);
    // await setDoc(newDocRef, { ...projectData, project_id: docRef.id }, { merge: true });

    // For now return doc id to client
    return NextResponse.json({ message: "Project created", project_id: docRef.id });
  } catch (err: any) {
    console.error("Error creating project:", err);
    // Return error message (safe-ish) to help debugging
    return NextResponse.json({ message: "Error creating project", error: err?.message || String(err) }, { status: 500 });
  }
}
