import { db } from "../../../../lib/firebaseConfig"; // your firebase config
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { name, email, localEmail } = await req.json();
    if (!email || !localEmail)
      return new Response("Email missing", { status: 400 });

    const docRef = doc(db, "users", localEmail.toLowerCase());
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return new Response("Original user not found", { status: 404 });
    }

    // Merge updates: only name and email fields will change
    await setDoc(
      docRef,
      {
        name: name || "",
        email: email.toLowerCase(),
      },
      { merge: true } // important to preserve other fields
    );

    return new Response(JSON.stringify({ message: "Profile updated" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Error updating profile", { status: 500 });
  }
}
