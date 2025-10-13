"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("inviteId");
  const [message, setMessage] = useState("Loading invitation...");

  useEffect(() => {
    const handleAccept = async () => {
      if (!inviteId) return;

      try {
        const inviteRef = doc(db, "collaborationInvites", inviteId);
        const snap = await getDoc(inviteRef);

        if (!snap.exists()) {
          setMessage("Invitation not found or expired.");
          return;
        }

        const invite = snap.data();

        if (invite.status === "accepted") {
          setMessage("This invitation is already accepted.");
          return;
        }

        // 1️⃣ Mark invite accepted
        await updateDoc(inviteRef, { status: "accepted" });

        // 2️⃣ Add collaborator to project
        const projectRef = doc(db, "projects", invite.projectId);
        await updateDoc(projectRef, {
          collaborators: arrayUnion(invite.email),
        });

        setMessage("🎉 Invitation accepted! You can now access the project.");
      } catch (err) {
        console.error(err);
        setMessage("Error accepting invitation.");
      }
    };

    handleAccept();
  }, [inviteId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xl">{message}</p>
    </div>
  );
}