"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";

type Project = {
  project_id: string;
  name: string;
  ownerid: string;
  collaborators: string[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [collabDialogOpen, setCollabDialogOpen] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    []
  );

  const [removing, setRemoving] = useState(false);

  // --- Fetch Projects ---
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const ownerid = localStorage.getItem("userEmail");
      const res = await fetch("/api/project/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerid }),
      });

      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      // console.error(err);
      // alert("Failed to fetch projects");
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // --- Create Project ---
  const handleSaveProject = async () => {
    setIsSaving(true);
    const ownerid = localStorage.getItem("userEmail");

    try {
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, ownerid }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setOpen(false);
      setNewProjectName("");
      fetchProjects();
    } catch (err) {
      // console.error(err);
      // alert("Error creating project");
      toast.error("Error creating project");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Remove collaborators ---
  const removeCollaborators = async () => {
    if (!selectedProject) return;
    setRemoving(true);

    try {
      const res = await fetch("/api/project/remove-collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProject.project_id,
          collaboratorsToRemove: selectedCollaborators,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // alert("Collaborators removed");
      toast.success("Collaborators removed");
      setCollabDialogOpen(false);

      fetchProjects();
    } catch (err) {
      // alert("Error removing collaborators");
      toast.error("Error removing collaborators");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col ">
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Projects
        </h2>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Project Name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />

              <Button disabled={isSaving} onClick={handleSaveProject}>
                {isSaving ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-1" />
                ) : null}
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* <Avatar>
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar> */}
      </header>

      <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-950">
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Last Edited</TableHead>
                    <TableHead>Collaborators</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {projects.map((proj) => {
                    const lastEdited = proj.updatedAt
                      ? new Date(proj.updatedAt).toLocaleString()
                      : "—";

                    const collaboratorsCount = proj.collaborators?.length || 0;

                    return (
                      <TableRow key={proj.project_id}>
                        <TableCell>
                          <Link href={`/projects/${proj.project_id}`}>
                            {proj.name}
                          </Link>
                        </TableCell>

                        <TableCell>{lastEdited}</TableCell>

                        <TableCell>{collaboratorsCount}</TableCell>

                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedProject(proj);
                              setSelectedCollaborators([]);
                              setCollabDialogOpen(true);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* --- Collaborator Removal Dialog --- */}
      <Dialog open={collabDialogOpen} onOpenChange={setCollabDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Collaborators</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {selectedProject?.collaborators?.length ? (
              selectedProject.collaborators.map((email) => (
                <label key={email} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={email}
                    checked={selectedCollaborators.includes(email)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedCollaborators((prev) =>
                        checked
                          ? [...prev, email]
                          : prev.filter((x) => x !== email)
                      );
                    }}
                  />
                  <span>{email}</span>
                </label>
              ))
            ) : (
              <p>No collaborators</p>
            )}

            <Button
              disabled={removing || !selectedCollaborators.length}
              onClick={removeCollaborators}
            >
              {removing ? (
                <Loader2 className="animate-spin h-4 w-4 mr-1" />
              ) : null}
              {removing ? "Removing..." : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
