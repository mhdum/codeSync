import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientRedirect({ children }: { children: React.ReactNode }) {
   const { status } = useSession();
  const router = useRouter();
   const [checking, setChecking] = useState(true);
  

  // Synchronously check localStorage
  const localUserEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;

  useEffect(() => {
    if (status === "authenticated" || localUserEmail) {
      router.replace("/dashboard"); // redirect immediately
    } else if (status === "loading") {
      // Show a loading state if the session is still loading
      setChecking(false);
    }
  }, [status, localUserEmail, router]);
  if (checking || status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return <>{children}</>;
}
