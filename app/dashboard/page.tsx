"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileCode, Folder, Users, Settings, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Project {
  name: string;
  createdAt: Date;
  project_id?: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [projectName, setProjectName] = useState("Project 1");
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; image?: string } | null>(null);

  // Store user email locally
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      localStorage.setItem("userEmail", session.user.email);
    }
  }, [status, session]);

  // Fetch profile and projects
  useEffect(() => {
    const fetchProfile = async () => {
      const email = localStorage.getItem("userEmail");
      if (!email) return;

      try {
        const res = await fetch(`/api/profile/get?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const data = await res.json();
        setUserProfile(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchProjects = async () => {
      const ownerid = localStorage.getItem("userEmail");
      if (!ownerid) return;

      try {
        const res = await fetch(`/api/project/get?ownerid=${encodeURIComponent(ownerid)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.projects)) {
          const projectsWithDate = data.projects.map((proj: any) => ({
            ...proj,
            createdAt: proj.createdAt?.seconds ? new Date(proj.createdAt.seconds * 1000) : new Date(),
          }));
          setProjects(projectsWithDate);
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProfile();
    fetchProjects();
  }, []);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "unauthenticated")
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Please log in
      </button>
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = projectName?.trim();
    if (!trimmed) {
      setError("Project name is required");
      return;
    }
    setError("");

    const ownerid = localStorage.getItem("userEmail");
    if (!ownerid) return alert("No owner ID found. Make sure you're logged in.");

    setIsSaving(true);
    try {
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, ownerid }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to create project");

      const newProj: Project = {
        name: trimmed,
        createdAt: new Date(),
        project_id: json.project_id,
      };
      setProjects((prev) => [newProj, ...prev]);

      setProjectName("Project 1");
      dialogCloseRef.current?.click();
      alert(`Project "${trimmed}" created successfully!`);
    } catch (err) {
      console.error("Create project error:", err);
      alert("Error creating project. Check console and server logs.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-800">CodeCollab</h1>
        </div>
        <nav className="mt-4">
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full justify-start">
                  <FileCode className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/projects">
                <Button variant="ghost" className="w-full justify-start">
                  <Folder className="mr-2 h-4 w-4" />
                  Projects
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/collaborators">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Collaborators
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/settings">
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <div className="flex items-center space-x-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">New Project</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Add details to make a new project</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 mt-4">
                    <div className="grid gap-3">
                      <Label htmlFor="projectname">Project Name</Label>
                      <Input
                        id="projectname"
                        name="projectname"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Enter project name"
                      />
                      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    </div>
                  </div>

                  <DialogFooter className="mt-6">
                    <DialogClose asChild>
                      <Button variant="outline" ref={dialogCloseRef}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" />
                          Saving...
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Profile Avatar with skeleton */}
            {loadingProfile ? (
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
            ) : userProfile?.image ? (
              <Avatar>
                <AvatarImage src={userProfile.image} alt={userProfile.name || "User"} />
              </Avatar>
            ) : (
              <Avatar>
                <AvatarFallback>{userProfile?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
            )}
            
            <Button
              variant="destructive"
              onClick={async () => {
              // Clear local storage
              localStorage.removeItem("userEmail");
            // Sign out from NextAuth
              await signOut({ redirect: false });
              // Redirect to home page
              window.location.href = "/";
          }}
          >
            Logout
          </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="grid gap-6">
            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProjects ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 bg-gray-200 animate-pulse rounded-md flex items-center justify-center text-gray-400"
                      >
                        Loading...
                      </div>
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-muted-foreground">No projects created yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project, index) => (
                      <Card key={project.project_id ?? index}>
                        <CardHeader>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">
                            Last edited: {project.createdAt.toLocaleString()}
                          </p>
                         <Link
                              href={{
                              pathname: "/open",
                              query: {
                              projectId: project.project_id, // ✅ pass the project id
                              filename: project.name,        // (optional) also pass filename
      
                          },
                          }}
                        >
                            <Button variant="link" className="mt-2">
                              Open Project
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
