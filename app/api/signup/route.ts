import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const userRef = adminDb.collection("users").doc(emailLower);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await userRef.set({
      email: emailLower,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
