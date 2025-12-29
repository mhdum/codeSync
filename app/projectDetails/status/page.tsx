"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  projectId: string;
  projectTitle: string;
  completed: boolean;
  name: string;
}

export default function ProjectsCompletionPage() {
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [nonCompleted, setNonCompleted] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // 1️⃣ Load user email from localStorage
  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    setUserEmail(email);
  }, []);

  // 2️⃣ Fetch data when email is available
  useEffect(() => {
    if (!userEmail) return; // wait for email

    async function fetchData() {
      try {
        setLoading(true);

        const res = await fetch("/api/project/status/completed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to fetch");
          return;
        }

        setCompleted(data.completed || []);
        setNonCompleted(data.nonCompleted || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Something went wrong");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userEmail]);

  return (
    <div className="bg-gray-50 dark:bg-gray-950 container mx-auto p-6 space-y-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Project Completion Overview
        </h1>
        <p className="text-muted-foreground mt-2">
          Click any project to open its detail page.
        </p>
      </header>

      <Separator className="my-8" />

      {error && <p className="text-red-500 text-center font-medium">{error}</p>}

      {!userEmail && (
        <p className="text-center text-sm text-muted-foreground">
          No user logged in.
        </p>
      )}

      {userEmail && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-l-4 border-l-green-500 dark:border-l-green-400">
            <CardHeader className="flex flex-row items-center gap-3">
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                Completed
              </Badge>
              <CardTitle className="text-xl">Completed Projects</CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <SkeletonList />
              ) : completed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No completed projects.
                </p>
              ) : (
                <ul className="space-y-3">
                  {completed.map((proj) => (
                    <Link
                      key={proj.projectId}
                      href={{
                        pathname: "/open",
                        query: {
                          projectId: proj.projectId, // ✅ pass the project id
                          filename: proj.projectTitle,
                        },
                      }} // ← your dynamic page
                    >
                      <li
                        className="flex items-center justify-between p-2 rounded-md 
                       hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <span className="font-medium">{proj.projectTitle}</span>
                        <Badge variant="secondary" className="text-xs">
                          Done
                        </Badge>
                      </li>
                    </Link>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-400">
            <CardHeader className="flex flex-row items-center gap-3">
              <Badge
                variant="outline"
                className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
              >
                Pending
              </Badge>
              <CardTitle className="text-xl">Non-Completed Projects</CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <SkeletonList />
              ) : nonCompleted.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All projects are completed 🎉
                </p>
              ) : (
                <ul className="space-y-3">
                  {nonCompleted.map((proj) => (
                    <Link
                      key={`${proj.projectId}-${proj.name}`}
                      href={{
                        pathname: "/open",
                        query: {
                          projectId: proj.projectId,
                          filename: proj.name,
                        },
                      }}
                    >
                      <li
                        className="flex items-center justify-between p-2 rounded-md 
                       hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <span className="font-medium">
                          {proj.name || "Untitled Project"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          In Progress
                        </Badge>
                      </li>
                    </Link>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  );
}
