"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";

interface Props {
  children: ReactNode;
}

// This handles the redirect logic after login
function RedirectLogic({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
const [checking, setChecking] = useState(true);
const localUserEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;


  useEffect(() => {
    // If user is authenticated or localStorage has userEmail, redirect to /home
    if (
      (status === "authenticated" && session?.user?.email) ||
      localUserEmail
    ) {
      setChecking(false);
      router.push("/home");
    }else if (status === "loading") {
      // Show a loading state if the session is still loading
      setChecking(false);
    }

    
  }, [session, status, router]);

  if (checking || status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return <>{children}</>;
}

export default function ClientLayoutWrapper({ children }: Props) {
  return (
    // SessionProvider must wrap everything that uses useSession
    <SessionProvider>
      <RedirectLogic>{children}</RedirectLogic>
    </SessionProvider>
  );
}
