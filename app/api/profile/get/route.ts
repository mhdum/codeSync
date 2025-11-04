import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // use admin SDK

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Use Firestore Admin SDK to get document directly by ID (email)
    const userRef = adminDb.collection("users").doc(email);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userSnap.data());
  } catch (error: any) {
    console.error("🔥 Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user", details: error.message },
      { status: 500 }
    );
  }
}
