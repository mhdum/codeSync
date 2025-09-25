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
import { FileCode, Folder, Users, Settings } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Project {
  name: string;
  createdAt: Date;
}

export default function Dashboard() {
  const { data: session, status } = useSession();

  const [projectName, setProjectName] = useState("Project 1");
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      localStorage.setItem("userEmail", session.user.email);
    }
  }, [status, session]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    setError("");
    const newProject: Project = {
      name: projectName,
      createdAt: new Date(),
    };

    console.log("Hello");

    setProjects((prevProjects) => [...prevProjects, newProject]);
    alert(`Project "${projectName}" created successfully!`);
    setProjectName("Project 1"); // Reset form
    dialogCloseRef.current?.click(); // Programmatically close dialog
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
                    <Button type="submit">Save changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" alt="User" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
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
                {projects.length === 0 ? (
                  <p className="text-muted-foreground">
                    No projects created yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {project.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">
                            Last edited: {project.createdAt.toLocaleString()}
                          </p>
                          <Link href={`/projects/${index}`}>
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
