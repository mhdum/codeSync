import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Fetch user from Firestore
    const userDoc = await adminDb
      .collection("users")
      .doc(email.toLowerCase())
      .get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // Compare passwords
    const isMatch = await bcrypt.compare(password, userData?.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT token (optional: use NextAuth instead)
    const token = jwt.sign(
      {
        uid: userDoc.id,
        email: userData?.email,
        role: userData?.role,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "7d" }
    );

    // Return success response
    return NextResponse.json({
      message: "Login successful",
      user: {
        email: userData?.email,
        role: userData?.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
