"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";

interface Props {
  children: ReactNode;
}

function RedirectLogic({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {  status } = useSession();
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const localUserEmail =
      typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    
    // console.log(`loading status ${status}`);

    if (status === "loading") return;

    // Redirect unauthenticated users to login
    if (
      status === "unauthenticated"
      
      //  &&  !localUserEmail 
      
      // && pathname !== "/login"
    ) {
      console.log("pusing user to home ... ");
      if (!redirecting) {
        setRedirecting(true);
        router.push("/"); // trigger redirect
      }
      // router.push("/");
      return;
    }

    // Redirect authenticated users from root "/" to dashboard
    if (
      status === "authenticated" &&
      localUserEmail 

      // && (pathname === "/" || pathname === "/login")
      
    ) {
      if (!redirecting) {
        setRedirecting(true);
        router.push("/dashboard");
      }
      return;
    }

    setChecking(false);
  }, [status, router, pathname]);

  if (checking && status === "loading" && !redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}

export default function ClientLayoutWrapper({ children }: Props) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <RedirectLogic>{children}</RedirectLogic>
    </SessionProvider>
  );
}
