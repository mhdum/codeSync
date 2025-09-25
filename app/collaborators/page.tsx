"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Edit, Trash } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Collaborators() {
  const [selectedProject, setSelectedProject] = useState("all");

  // Mock project and collaborator data
  const projects = [
    { id: "1", name: "Project Alpha" },
    { id: "2", name: "Project Beta" },
    { id: "3", name: "Project Gamma" },
  ];

  const collaborators = [
    { name: "John Doe", email: "john@example.com", role: "Editor", projectIds: ["1", "2"] },
    { name: "Jane Smith", email: "jane@example.com", role: "Admin", projectIds: ["1", "2", "3"] },
    { name: "Alex Brown", email: "alex@example.com", role: "Viewer", projectIds: ["2"] },
  ];

  // Filter collaborators based on selected project
  const filteredCollaborators = selectedProject === "all"
    ? collaborators
    : collaborators.filter(collaborator => collaborator.projectIds.includes(selectedProject));

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
                  <Users className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/projects">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Projects
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/collaborators">
                <Button variant="default" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Collaborators
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/settings">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
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
          <h2 className="text-xl font-semibold">Collaborators</h2>
          <div className="flex items-center space-x-4">
            <Select onValueChange={setSelectedProject} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Collaborator
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" alt="User" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Collaborators Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedProject === "all" 
                  ? "All Collaborators" 
                  : `Collaborators for ${projects.find(p => p.id === selectedProject)?.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollaborators.map((collaborator) => (
                    <TableRow key={collaborator.email}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/placeholder-${collaborator.name.toLowerCase().replace(" ", "-")}.jpg`} alt={collaborator.name} />
                            <AvatarFallback>{collaborator.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <span>{collaborator.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{collaborator.email}</TableCell>
                      <TableCell>{collaborator.role}</TableCell>
                      <TableCell>
                        {collaborator.projectIds.map(projectId => {
                          const project = projects.find(p => p.id === projectId);
                          return project ? project.name : "";
                        }).filter(name => name).join(", ")}
                      </TableCell>
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
    </div>
  );
}