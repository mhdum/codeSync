"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Tooltip,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
  ChartTooltip,
} from "@/components/ui/chart";

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
import { useEffect, useMemo, useRef, useState } from "react";
import SideBar from "@/components/SideBar";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

interface Project {
  name: string;
  createdAt: Date;
  project_id?: string;
}

type ProjectName = "Project A" | "Project B" | "Project C" | "Project D";

interface ActivityDay {
  day: string;
  "Project A": number;
  "Project B": number;
  "Project C": number;
  "Project D": number;
  [key: string]: string | number;
}


type CompletedProject = {
  projectId: string;
  projectTitle: string;
  completedAt?: { seconds: number };
};

type CreatedProject = {
  projectId: string;
  projectTitle: string;
  createdAt?: { seconds: number };
};


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

  const [userProfile, setUserProfile] = useState<{
    name?: string;
    email?: string;
    image?: string;
  } | null>(null);

  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);

  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);

  const [stats, setStats] = useState({
    completedPercentage: 0,
    nonCompletedPercentage: 0,
  });

  const [projectStats, setProjectStats] = useState<{
    completedProjects: CompletedProject[];
    createdProjects: CreatedProject[];
  }>({
    completedProjects: [],
    createdProjects: [],
  });

  const [durationsLoading, setDurationsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();

  useEffect(() => {
    const loadStats = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      const res = await fetch(
        `/api/project/status/summary?userEmail=${userEmail}`
      );

      const data = await res.json();

      setStats({
        completedPercentage: data.completedPercentage,
        nonCompletedPercentage: data.nonCompletedPercentage,
      });

      setLoading(false);
    };

    loadStats();
  }, []);

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
        const [owned, collaborated] = await Promise.all([
          fetchOwned(),
          fetchCollaborated(),
        ]);

        // save owner-only list
        setOwnedProjects(owned);

        // dedupe by project_id (keep owner version if duplicate)
        const map = new Map<string, any>();
        [...owned, ...collaborated].forEach((p) => {
          if (!p.project_id) return; // skip invalid
          if (!map.has(p.project_id)) map.set(p.project_id, p);
          else {
            const existing = map.get(p.project_id);
            if (existing.role !== "owner" && p.role === "owner")
              map.set(p.project_id, p);
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
        const res = await fetch(
          `/api/profile/get?email=${encodeURIComponent(email)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setUserProfile(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchStats = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setDurationsLoading(false);
        console.warn("fetchStats: no userEmail in localStorage");
        return;
      }

      try {
        setDurationsLoading(true);
        const res = await fetch(`/api/project/project-stats?userEmail=${encodeURIComponent(userEmail)}`);
        if (!res.ok) {
          console.error("project-stats fetch failed", res.status);
          setDurationsLoading(false);
          return;
        }

        const data = await res.json();

        // percentages
        setStats({
          completedPercentage: data.completedPercentage ?? 0,
          nonCompletedPercentage: data.nonCompletedPercentage ?? 0,
        });

        // project arrays (defensive)
        setProjectStats({
          completedProjects: Array.isArray(data.completedProjects) ? data.completedProjects : [],
          createdProjects: Array.isArray(data.createdProjects) ? data.createdProjects : [],
        });

      } catch (err) {
        console.error("fetchStats error:", err);
      } finally {
        setDurationsLoading(false);
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
        const res = await fetch(
          `/api/project/get?ownerid=${encodeURIComponent(email)}`
        );
        if (!res.ok) {
          console.warn("project/get failed", res.status);
          return [];
        }
        const json = await res.json();
        const list = (json.projects || []).map((p: any) => ({
          project_id: p.project_id ?? p.id ?? null,
          name: p.name ?? "Untitled",
          ownerId: p.ownerid ?? email,
          createdAt: p.createdAt?.seconds
            ? new Date(p.createdAt.seconds * 1000)
            : p.createdAt
              ? new Date(p.createdAt)
              : new Date(),
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
        const res = await fetch(
          `/api/collaborations/get?email=${encodeURIComponent(email)}`
        );
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
    fetchStats();
    fetchProfile();
    // fetchProjects();
  }, [searchParams]);

  useEffect(() => {
    const pendingInvite = localStorage.getItem("pendingInvite");
    const email = localStorage.getItem("userEmail");
    if (pendingInvite && email) {
      (async () => {
        try {
          const res = await fetch("/api/invite/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviteId: pendingInvite, email }),
          });
          const data = await res.json();
          if (res.ok) {
            console.log("✅ Pending invite auto-accepted:", data);
            localStorage.removeItem("pendingInvite");
            window.location.href = "/dashboard?refresh=true";
          } else {
            console.error("Failed auto-accept invite:", data);
          }
        } catch (err) {
          console.error("Error auto-accepting invite:", err);
        }
      })();
    }
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
    if (!ownerid)
      return alert("No owner ID found. Make sure you're logged in.");

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
    if (selectedProjects.length === 0)
      return alert("Please select at least one project.");

    const senderId = localStorage.getItem("userEmail");
    if (!senderId) return alert("Missing sender info.");

    setSendingInvite(true);
    try {
      // Send invite for all selected projects
      for (const project of selectedProjects) {
        const res = await fetch("/api/invite/send", {
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

  function parseTimestampToMs(raw: any): number | null {
    if (!raw) return null;

    // Firestore Timestamp (canonical)
    if (typeof raw === "object" && (raw.seconds || raw._seconds)) {
      const seconds = raw.seconds ?? raw._seconds;
      return typeof seconds === "number" ? seconds * 1000 : null;
    }

    // If backend returned Date-like object
    if (raw instanceof Date) return raw.getTime();

    // If backend returned ISO string
    if (typeof raw === "string") {
      const t = Date.parse(raw);
      return isNaN(t) ? null : t;
    }

    // number (milliseconds)
    if (typeof raw === "number") return raw;

    return null;
  }

  const projectDurations = useMemo(() => {
    if (!projectStats.completedProjects.length) return [];

    return projectStats.completedProjects.map((proj) => {
      const created = projectStats.createdProjects.find(
        (c) => c.projectId === proj.projectId
      );

      const createdAtMs = parseTimestampToMs(created?.createdAt);
      const completedAtMs = parseTimestampToMs(proj?.completedAt);

      // If missing timestamps → return 0 days
      if (!createdAtMs || !completedAtMs) {
        return {
          projectTitle: proj.projectTitle,
          durationDays: 0,
        };
      }

      const durationMs = completedAtMs - createdAtMs;
      const durationDays = Math.max(
        0,
        Math.ceil(durationMs / (1000 * 60 * 60 * 24))
      );

      return {
        projectTitle: proj.projectTitle,
        durationDays,
      };
    });
  }, [projectStats]);


  const activityHeatmapData: ActivityDay[] = [
    {
      day: "Mon",
      "Project A": 5,
      "Project B": 2,
      "Project C": 0,
      "Project D": 3,
    },
    {
      day: "Tue",
      "Project A": 3,
      "Project B": 1,
      "Project C": 2,
      "Project D": 0,
    },
    {
      day: "Wed",
      "Project A": 4,
      "Project B": 5,
      "Project C": 3,
      "Project D": 2,
    },
    {
      day: "Thu",
      "Project A": 6,
      "Project B": 3,
      "Project C": 1,
      "Project D": 4,
    },
    {
      day: "Fri",
      "Project A": 2,
      "Project B": 0,
      "Project C": 4,
      "Project D": 3,
    },
    {
      day: "Sat",
      "Project A": 1,
      "Project B": 2,
      "Project C": 2,
      "Project D": 1,
    },
    {
      day: "Sun",
      "Project A": 0,
      "Project B": 3,
      "Project C": 1,
      "Project D": 2,
    },
    {
      day: "Mon",
      "Project A": 4,
      "Project B": 4,
      "Project C": 2,
      "Project D": 3,
    },
    {
      day: "Tue",
      "Project A": 2,
      "Project B": 5,
      "Project C": 3,
      "Project D": 4,
    },
    {
      day: "Wed",
      "Project A": 5,
      "Project B": 3,
      "Project C": 4,
      "Project D": 2,
    },
    {
      day: "Thu",
      "Project A": 6,
      "Project B": 4,
      "Project C": 1,
      "Project D": 5,
    },
    {
      day: "Fri",
      "Project A": 3,
      "Project B": 1,
      "Project C": 2,
      "Project D": 0,
    },
    {
      day: "Sat",
      "Project A": 2,
      "Project B": 0,
      "Project C": 3,
      "Project D": 1,
    },
    {
      day: "Sun",
      "Project A": 1,
      "Project B": 3,
      "Project C": 1,
      "Project D": 4,
    },
  ];

  function getColor(intensity: number) {
    const max = 6; // maximum possible activity value
    const scale = intensity / max;
    if (scale === 0) return "hsl(var(--muted))";
    return `hsl(var(--chart-1) / ${0.3 + scale * 0.7})`;
  }

  const projectLists: ProjectName[] = [
    "Project A",
    "Project B",
    "Project C",
    "Project D",
  ];

  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Dashboard
        </h2>
        <div className="flex items-center space-x-4">
          {/* Send Invite Dialog */}
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
                  Type the email of the person you want to invite and select the
                  project(s)
                  <br />
                  <span className="text-sm text-muted-foreground">
                    The recipient will be added with <strong>viewer-only access</strong>.
                  </span>
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
                  <p className="text-sm text-gray-500 mt-2">
                    No projects available to invite collaborators to.
                  </p>
                ) : (
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {ownedProjects.map((project) => (
                      <div
                        key={project.project_id}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          id={`project-${project.project_id}`}
                          checked={selectedProjects.some(
                            (p) => p.project_id === project.project_id
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects((prev) => [...prev, project]);
                            } else {
                              setSelectedProjects((prev) =>
                                prev.filter(
                                  (p) => p.project_id !== project.project_id
                                )
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label
                          htmlFor={`project-${project.project_id}`}
                          className="text-sm"
                        >
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
                  disabled={
                    sendingInvite ||
                    selectedProjects.length === 0 ||
                    !inviteEmail
                  }
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
                  <DialogDescription>
                    Add details to make a new project
                  </DialogDescription>
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
                    {error && (
                      <p className="text-red-500 text-sm mt-1">{error}</p>
                    )}
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
      <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Project Completion Status */}
                <Card
                  onClick={() => router.push("/projectDetails/status")}
                  className="cursor-pointer transition-transform hover:scale-[1.02] "
                >
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Project Completion Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[260px] flex justify-center items-center">
                    <ChartContainer
                      config={{
                        completed: {
                          label: "Completed",
                          color: "hsl(var(--chart-1))",
                        },
                        nonCompleted: {
                          label: "Non-Completed",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="w-full h-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={
                              loading
                                ? [
                                  { name: "Completed", value: 0 },
                                  { name: "Non-Completed", value: 100 },
                                ]
                                : [
                                  {
                                    name: "Completed",
                                    value: stats.completedPercentage,
                                    fill: "var(--color-completed)",
                                  },
                                  {
                                    name: "Non-Completed",
                                    value: stats.nonCompletedPercentage,
                                    fill: "var(--color-nonCompleted)",
                                  },
                                ]
                            }
                            dataKey="value"
                            nameKey="name"
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={5}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Languages Used */}
                <Link href="/projectDetails/languages" className="block">
                  <Card className="transition-transform hover:scale-[1.02] cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">Languages Used</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[260px] flex justify-center items-center">
                      <ChartContainer
                        config={{
                          java: { label: "Java", color: "hsl(var(--chart-1))" },
                          c: { label: "C", color: "hsl(var(--chart-2))" },
                          cpp: { label: "C++", color: "hsl(var(--chart-3))" },
                          python: {
                            label: "Python",
                            color: "hsl(var(--chart-4))",
                          },
                          others: {
                            label: "Others",
                            color: "hsl(var(--chart-5))",
                          },
                        }}
                        className="w-full h-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Java",
                                  value: 20,
                                  fill: "var(--color-java)",
                                },
                                {
                                  name: "C",
                                  value: 15,
                                  fill: "var(--color-c)",
                                },
                                {
                                  name: "C++",
                                  value: 10,
                                  fill: "var(--color-cpp)",
                                },
                                {
                                  name: "Python",
                                  value: 30,
                                  fill: "var(--color-python)",
                                },
                                {
                                  name: "Others",
                                  value: 25,
                                  fill: "var(--color-others)",
                                },
                              ]}
                              dataKey="value"
                              nameKey="name"
                              outerRadius="80%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/projectDetails/collaborators" className="block">
                  <Card className="transition-transform hover:scale-[1.02] cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Contribution Activity (Last 14 Days)
                      </CardTitle>
                      <CardDescription>
                        Commit frequency heatmap across all projects
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="h-[260px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <div className="grid grid-cols-[repeat(14,1fr)] gap-[4px] w-full h-full">
                          {activityHeatmapData.map((dayData, dayIndex) => (
                            <div
                              key={dayIndex}
                              className="flex flex-col gap-[4px]"
                            >
                              {projectLists.map((proj) => (
                                <div
                                  key={proj}
                                  title={`${proj}: ${dayData[proj]} commits`}
                                  className="rounded-sm"
                                  style={{
                                    backgroundColor: getColor(
                                      dayData[proj] as number
                                    ),
                                    width: "100%",
                                    aspectRatio: "1 / 1",
                                  }}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CardContent>
            <CardHeader>
              <CardTitle className="text-lg">Project Completion Time</CardTitle>
              <CardDescription>
                Duration taken to complete each project (CreatedAt → CompletedAt)
              </CardDescription>
            </CardHeader>

            <CardContent className="h-[260px]">
              {durationsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading project durations...</span>
                </div>
              ) : !projectDurations.length ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No completed project durations to show.
                </div>
              ) : (
                <ChartContainer
                  config={{
                    duration: {
                      label: "Duration (days)",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={projectDurations}
                      margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                      <XAxis
                        type="number"
                        tick={{ fill: "var(--foreground)", fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="projectTitle"
                        width={120}
                        tick={{ fill: "var(--foreground)", fontSize: 11 }}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--foreground)",
                        }}
                      />

                      <Bar
                        dataKey="durationDays"
                        fill="hsl(var(--chart-3))"
                        radius={[0, 6, 6, 0]}
                        barSize={28}
                        animationDuration={800}
                        animationEasing="ease-in-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>

                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">
                Recent Projects
              </CardTitle>
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
                <p className="text-muted-foreground">
                  No projects created yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project, index) => (
                    <Card key={project.project_id ?? index}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {project.name}
                        </CardTitle>
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
                              filename: project.name, // (optional) also pass filename
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
