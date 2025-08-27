
"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
    localStorage.setItem("userEmail", session.user?.email || "");
    //   alert(`Welcome, ${session.user?.email}!`);
    }
  }, [status, session]);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "unauthenticated") return <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Please log in
      </button>

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Welcome, {session.user?.email}</h1>
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
