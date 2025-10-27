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
import { FileCode, Folder, Users, Settings, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import SideBar from "@/components/SideBar";
import { useSearchParams } from "next/navigation";

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
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const inviteCloseRef = useRef<HTMLButtonElement>(null);

  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; image?: string } | null>(null);

  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);

  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);

  const searchParams = useSearchParams();
  // Store user email locally
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      localStorage.setItem("userEmail", session.user.email);
    }
  }, [status, session]);

  // Fetch profile and projects
  useEffect(() => {

    const email = localStorage.getItem("userEmail");
    if (!email) return;
    const loadAll = async () => {
      setLoadingProjects(true);
      try {
        const [owned, collaborated] = await Promise.all([fetchOwned(), fetchCollaborated()]);

        // save owner-only list
        setOwnedProjects(owned);

        // dedupe by project_id (keep owner version if duplicate)
        const map = new Map<string, any>();
        [...owned, ...collaborated].forEach((p) => {
          if (!p.project_id) return; // skip invalid
          if (!map.has(p.project_id)) map.set(p.project_id, p);
          else {
            const existing = map.get(p.project_id);
            if (existing.role !== "owner" && p.role === "owner") map.set(p.project_id, p);
          }
        });
        const merged = Array.from(map.values());
        console.log("Merged projects:", merged);
        setProjects(merged);
      } catch (e) {
        console.error("loadAll error", e);
      } finally {
        setLoadingProjects(false);
      }
    };

    const refresh = searchParams.get("refresh");
    loadAll(); // ✅ run even if already mounted

    if (refresh) {
      console.log("Force refreshing dashboard data after invite accept");
    }

    const fetchProfile = async () => {

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

    // const fetchProjects = async () => {
    //   const ownerid = localStorage.getItem("userEmail");
    //   if (!ownerid) return;

    //   try {
    //     const res = await fetch(`/api/project/get?ownerid=${encodeURIComponent(ownerid)}`);
    //     if (!res.ok) return;
    //     const data = await res.json();
    //     if (Array.isArray(data.projects)) {
    //       const projectsWithDate = data.projects.map((proj: any) => ({
    //         ...proj,
    //         createdAt: proj.createdAt?.seconds ? new Date(proj.createdAt.seconds * 1000) : new Date(),
    //       }));
    //       setProjects(projectsWithDate);
    //     }
    //   } catch (err) {
    //     console.error("Error fetching projects:", err);
    //   } finally {
    //     setLoadingProjects(false);
    //   }
    // };

    const parseCreatedAt = (raw: any) => {
      if (!raw) return new Date();
      if (raw.seconds) return new Date(raw.seconds * 1000); // Firestore timestamp
      if (typeof raw === "string") return new Date(raw); // ISO string
      if (raw instanceof Date) return raw;
      return new Date();
    };

    const fetchOwned = async () => {
      try {
        const res = await fetch(`/api/project/get?ownerid=${encodeURIComponent(email)}`);
        if (!res.ok) {
          console.warn("project/get failed", res.status);
          return [];
        }
        const json = await res.json();
        const list = (json.projects || []).map((p: any) => ({
          project_id: p.project_id ?? p.id ?? null,
          name: p.name ?? "Untitled",
          ownerId: p.ownerid ?? email,
          createdAt: p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : (p.createdAt ? new Date(p.createdAt) : new Date()),
          role: "owner",
        }));
        console.log("Owned projects:", list);
        return list;
      } catch (e) {
        console.error("fetchOwned error", e);
        return [];
      }
    };

    const fetchCollaborated = async () => {
      try {
        const res = await fetch(`/api/collaborations/get?email=${encodeURIComponent(email)}`);
        if (!res.ok) {
          console.warn("collaborations/get failed", res.status);
          return [];
        }
        const json = await res.json();
        console.log("Collaborations API response:", json);
        const list = (json.projects || []).map((p: any) => ({
          project_id: p.project_id ?? p.id ?? null,
          name: p.name ?? "Untitled",
          ownerId: p.ownerId ?? p.ownerid ?? null,
          createdAt: parseCreatedAt(p.createdAt),
          role: "collaborator",
        }));
        console.log("Collaborated projects parsed:", list);
        return list;
      } catch (e) {
        console.error("fetchCollaborated error", e);
        return [];
      }
    };



    loadAll();

    fetchProfile();
    // fetchProjects();
  }, [searchParams]);

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
      // ✅ Update both project lists
    setProjects((prev) => [newProj, ...prev]);
    setOwnedProjects((prev) => [newProj, ...prev]); // <---- add this line

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

  // ✉️ Send Invite
  const handleSendInvite = async () => {
    if (!inviteEmail) return alert("Please enter an email address.");
    if (selectedProjects.length === 0) return alert("Please select at least one project.");

    const senderId = localStorage.getItem("userEmail");
    if (!senderId) return alert("Missing sender info.");

    setSendingInvite(true);
    try {
      // Send invite for all selected projects
      for (const project of selectedProjects) {
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            projectId: project.project_id,
            projectName: project.name,
            selectedProjects,
            senderId,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to send invite");
      }

      alert(`✅ Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setSelectedProjects([]);
      inviteCloseRef.current?.click();
    } catch (err: any) {
      console.error("Invite send error:", err);
      alert(err.message || "Error sending invite.");
    } finally {
      setSendingInvite(false);
    }
  };

  return (

    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="flex items-center space-x-4">
          {/* 🔹 Send Invite Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Send Collaboration Invite</DialogTitle>
                <DialogDescription>
                  Type the email of the person you want to invite and select the project(s)
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-3">
                <Label htmlFor="inviteEmail">Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="example@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />

                <Label className="mt-4">Select Project(s)</Label>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading projects...</span>
                  </div>
                ) : ownedProjects.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-2">No projects available to invite collaborators to.</p>
                ) : (
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {ownedProjects.map((project) => (
                      <div key={project.project_id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`project-${project.project_id}`}
                          checked={selectedProjects.some((p) => p.project_id === project.project_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects((prev) => [...prev, project]);
                            } else {
                              setSelectedProjects((prev) =>
                                prev.filter((p) => p.project_id !== project.project_id)
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`project-${project.project_id}`} className="text-sm">
                          {project.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              <DialogFooter className="mt-6 flex justify-between">
                <DialogClose asChild>
                  <Button variant="outline" ref={inviteCloseRef}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSendInvite}
                  disabled={sendingInvite || selectedProjects.length === 0 || !inviteEmail}
                >
                  {sendingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
  );
}
