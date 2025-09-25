"use client";

import { Router } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      localStorage.setItem("userEmail", session.user.email);
      router.push("/dashboard");
    }
  }, [status, session]);

  if (status === "loading") return <p>Loading...</p>;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "unauthenticated") return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">
        Welcome, {session?.user?.email ?? "User"}
      </h1>
      <button
        onClick={() => {
          localStorage.removeItem("userEmail");
          signOut({ callbackUrl: "/login" });
        }}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Sign Out
      </button>
    </div>
  );
}
