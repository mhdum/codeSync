import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCode, Plus, Edit, Trash } from "lucide-react";
import Link from "next/link";

export default function Projects() {
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
                <Button variant="default" className="w-full justify-start">
                  <FileCode className="mr-2 h-4 w-4" />
                  Projects
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/collaborators">
                <Button variant="ghost" className="w-full justify-start">
                  <FileCode className="mr-2 h-4 w-4" />
                  Collaborators
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/settings">
                <Button variant="ghost" className="w-full justify-start">
                  <FileCode className="mr-2 h-4 w-4" />
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
          <h2 className="text-xl font-semibold">Projects</h2>
          <div className="flex items-center space-x-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" alt="User" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Projects Content */}
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
    </div>
  );
}