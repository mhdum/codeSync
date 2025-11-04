import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { name, email, localEmail } = await req.json();

    if (!email || !localEmail) {
      return new Response("Email missing", { status: 400 });
    }

    const localEmailLower = localEmail.toLowerCase();
    const emailLower = email.toLowerCase();

    const userRef = adminDb.collection("users").doc(localEmailLower);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return new Response("Original user not found", { status: 404 });
    }

    // ✅ Update only specific fields while preserving others
    await userRef.set(
      {
        name: name || "",
        email: emailLower,
      },
      { merge: true } // ensures only provided fields are updated
    );

    return new Response(
      JSON.stringify({ message: "Profile updated" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("🔥 Error updating profile:", err);
    return new Response(
      JSON.stringify({
        message: "Error updating profile",
        error: err.message || String(err),
      }),
      { status: 500 }
    );
  }
}
