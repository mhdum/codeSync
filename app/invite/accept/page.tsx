// app/accept-invite/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("inviteId");
  const [message, setMessage] = useState("Loading invitation...");

  useEffect(() => {
    const handleAccept = async () => {
      const email = localStorage.getItem("userEmail");

      if (!inviteId) {
        setMessage("Invalid or missing invitation ID.");
        return;
      }

      if (!email) {
        // Save pending invite and redirect to login
        localStorage.setItem("pendingInvite", inviteId);
        window.location.href = "/";
        return;
      }

      try {
        const res = await fetch("/api/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId, email }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Invite accept failed:", data);
          setMessage(`❌ ${data.error || "Failed to accept invitation."}`);
          return;
        }

        setMessage("🎉 Invitation accepted! Redirecting...");
        // Add a small delay before redirect
        setTimeout(() => {
          window.location.href = "/dashboard?refresh=true";
        }, 1200);
      } catch (err) {
        console.error("Accept error:", err);
        setMessage("Error accepting invitation.");
      }
    };

    handleAccept();
  }, [inviteId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xl text-center px-4">{message}</p>
    </div>
  );
}
