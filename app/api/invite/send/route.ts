import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { email, selectedProjects, senderId } = await req.json();

    if (!email || !selectedProjects || !senderId || selectedProjects.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields or projects" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch sender profile to get name (from Admin SDK)
    const senderRef = adminDb.collection("users").doc(senderId.toLowerCase());
    const senderSnap = await senderRef.get();

    let senderName = "Someone";
    if (senderSnap.exists) {
      const senderData = senderSnap.data();
      senderName = senderData?.name || "Someone";
    }

    // 2️⃣ Create a new invite document (Admin SDK version)
    const inviteRef = await adminDb.collection("collaborationInvites").add({
      email,
      selectedProjects, // array of { projectId, projectName }
      senderId,
      status: "pending",
      createdAt: new Date(), // Admin SDK handles timestamps via JS Date
    });

    // 3️⃣ Generate a unique invite link
    const inviteLink = `${process.env.NEXTAUTH_URL}/invite/accept?inviteId=${inviteRef.id}`;

    // 4️⃣ Configure mail transporter (Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 5️⃣ Prepare project list HTML
    const projectListHTML = selectedProjects
      .map((p: any) => `<li>${p.name}</li>`)
      .join("");

    // 6️⃣ Send the email
    await transporter.sendMail({
      from: `"CodeSync" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "CodeSync Collaboration Invitation",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;">
          <h2 style="color:#4f46e5;">You've been invited to collaborate!</h2>
          <p>Hi there, <strong>${senderName}</strong> invited you to collaborate on the following project(s):</p>
          <ul>${projectListHTML}</ul>
          <a href="${inviteLink}" 
            style="display:inline-block;margin-top:12px;padding:10px 20px;background-color:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
            Accept Invitation
          </a>
          <p style="margin-top:12px;">If you didn’t expect this, you can ignore this email.</p>
        </div>
      `,
    });

    // ✅ Return success
    return NextResponse.json({
      success: true,
      inviteId: inviteRef.id,
      message: "Invitation email sent successfully!",
    });
  } catch (error: any) {
    console.error("🔥 Error sending invite:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invite" },
      { status: 500 }
    );
  }
}
