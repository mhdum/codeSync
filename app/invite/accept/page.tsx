"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("inviteId");
  const [message, setMessage] = useState("Loading invitation...");
  const loggedInEmail = localStorage.getItem("userEmail");

  if (!inviteId) return; 
  if (!loggedInEmail) {
  // User is not logged in → store inviteId to handle later
  localStorage.setItem("pendingInvite", inviteId);

  // Redirect to signup/login
  window.location.href = "/";
  return;
}

  useEffect(() => {
    const handleAccept = async () => {
      

      try {

        
        const inviteRef = doc(db, "collaborationInvites", inviteId);
        const snap = await getDoc(inviteRef);

        if (!snap.exists()) {
          setMessage("Invitation not found or expired.");
          return;
        }

        const invite = snap.data();

        // Ensure invite has projects
        if (!invite.selectedProjects || invite.selectedProjects.length === 0) {
          setMessage("Invalid invitation data.");
          return;
        }

        // ✅ Compare logged-in email
        
        if (!loggedInEmail || invite.email.toLowerCase() !== loggedInEmail.toLowerCase()) {
          setMessage("❌ You are not authorized to accept this invitation.");
          return;
        }

        // 1️⃣ Mark invite accepted
        await updateDoc(inviteRef, { status: "accepted" });

        // 2️⃣ Add collaborator to each project in selectedProjects
        for (const proj of invite.selectedProjects) {
          if (!proj.projectId) continue; // skip invalid
          const projectRef = doc(db, "projects", proj.projectId);
          await updateDoc(projectRef, {
          collaborators: arrayUnion(invite.email),
        });
        }



        setMessage("🎉 Invitation accepted! You can now access the project.");      } 
      catch (err) {
        console.error(err);
        setMessage("Error accepting invitation.");
      }
      setTimeout(() => {
        window.location.href = "/dashboard?refresh=true";
      }, 500);

    
    };

    handleAccept();
  }, [inviteId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xl">{message}</p>
    </div>
  );
}

