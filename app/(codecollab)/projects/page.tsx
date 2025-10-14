"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCode, Plus, Edit, Trash, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SideBar from "@/components/SideBar";

export default function Projects() {
  const [newProjectName, setNewProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false); // control modal

  const handleSaveProject = async () => {
    console.log("Saving project...");
    setIsSaving(true);
    const ownerid = localStorage.getItem("userEmail");
    console.log("Owner ID:", ownerid);
    if (!ownerid || !newProjectName.trim()) return;


    try {
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, ownerid }),
      });

      const data = await res.json();
      console.log("API response:", data);
      if (!res.ok) throw new Error(data.message || "Failed to create project");

      setNewProjectName("");
      setOpen(false);
      alert(`Project created successfully! ID: ${data.project_id}`);
    } catch (err) {
      console.error(err);
      alert("Error creating project. Check console.");
    } finally {
      setIsSaving(false);
    }
  };


  return (

    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Projects</h2>
        <div className="flex items-center space-x-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Project Name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
                <Button
                  onClick={async () => {
                    await handleSaveProject(); // explicitly call async function
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>


          <Avatar>
            <AvatarImage src="/placeholder-user.jpg" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Last Edited</TableHead>
                  <TableHead>Collaborators</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* TODO: fetch projects dynamically */}
                {[
                  { name: "Project Alpha", lastEdited: "2025-08-05", collaborators: 3 },
                  { name: "Project Beta", lastEdited: "2025-08-04", collaborators: 5 },
                  { name: "Project Gamma", lastEdited: "2025-08-03", collaborators: 2 },
                ].map((project) => (
                  <TableRow key={project.name}>
                    <TableCell className="font-medium">
                      <Link href={`/projects/${project.name.toLowerCase().replace(" ", "-")}`}>
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>{project.lastEdited}</TableCell>
                    <TableCell>{project.collaborators}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>

  );
}
