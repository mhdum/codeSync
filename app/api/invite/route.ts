import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "../../../lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { email, selectedProjects, senderId } = await req.json();

    if (!email || !selectedProjects || !senderId || selectedProjects.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields or projects" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch sender profile to get name
    const senderRef = doc(db, "users", senderId.toLowerCase());
    const senderSnap = await getDoc(senderRef);
    let senderName = "Someone";

    if (senderSnap.exists()) {
      const senderData = senderSnap.data();
      senderName = senderData.name || "Someone";
    }

    // 2️⃣ Create a new invite document in Firestore
    const inviteRef = await addDoc(collection(db, "collaborationInvites"), {
      email,
      selectedProjects, // store array of projects [{ projectId, projectName }]
      senderId,
      status: "pending",
      createdAt: serverTimestamp(),
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

    return NextResponse.json({
      success: true,
      inviteId: inviteRef.id,
      message: "Invitation email sent successfully!",
    });
  } catch (error: any) {
    console.error("Error sending invite:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
