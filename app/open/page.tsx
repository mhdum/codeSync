"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";



import { useToast } from "@/hooks/use-toast";


interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
}

interface ProjectFile {
  id: string;
  file_name: string;
  file_extension: string;
  createdBy: string;
  createdAt: any;
}

export default function ProjectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");
  const projectName = params.get("filename") || "Untitled Project";

  const [fileName, setFileName] = useState("");
  const [fileExtension, setFileExtension] = useState("");
  const [extensions, setExtensions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [selectedEditor, setSelectedEditor] = useState<string>("");

  const [savingRole, setSavingRole] = useState(false);

  const [userRole, setUserRole] = useState<"editor" | "viewer" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isCollaborator, setIsCollaborator] = useState(false);

  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingCollab, setLoadingCollab] = useState(true);
  const [loadingRole, setLoadingRole] = useState(true);


  const { toast } = useToast();

  // Fetch supported runtimes
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await fetch("https://emkc.org/api/v2/piston/runtimes");
        if (!res.ok) throw new Error("Failed to fetch runtimes");
        const data: PistonRuntime[] = await res.json();

        const allAliases = data.flatMap((runtime) => runtime.aliases);
        setExtensions(allAliases.sort());
      } catch (error) {
        console.error("Error fetching runtimes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  // Fetch files for this project
  useEffect(() => {
    if (!projectId) return;

    const fetchFiles = async () => {
      try {
        setLoadingFiles(true);

        const res = await fetch(`/api/files/get?projectId=${projectId}`);
        const data = await res.json();
        setFiles(data.files || []);
      } catch (err) {
        console.error("Error fetching files:", err);
      } finally {
        setLoadingFiles(false);
      }
    };
    fetchFiles();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        setLoadingCollab(true);

        const email = localStorage.getItem("userEmail");

        const res = await fetch(`/api/collaborations/${projectId}`, {
          headers: { "x-user-email": email || "" },
        });

        const data = await res.json();
        setCollaborators(data.collaborators || []);
      } finally {
        setLoadingCollab(false);
      }
    };

    fetchData();
  }, [projectId]);


  useEffect(() => {
    if (!projectId) return;

    const checkRole = async () => {

      try {
        setLoadingRole(true);
        const userEmail = localStorage.getItem("userEmail");
        console.log(`user email ${userEmail}`);
        const res = await fetch("/api/collaborations/check-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            userEmail,
          }),
        });

        const data = await res.json();
        console.log("data from check role endpoint ");
        console.log(data);
        setUserRole(data.role);
        setIsAdmin(data.isAdmin);
        setIsCollaborator(data.isCollaborator);

      } finally {
        setLoadingRole(false);
      }
    };

    checkRole();
  }, [projectId]);

  // Update Role
  const updateRole = async () => {
    if (!selectedEditor) {
      alert("Please select one collaborator as Editor.");
      return;
    }

    try {
      setSavingRole(true);

      const senderEmail = localStorage.getItem("userEmail");

      const res = await fetch("/api/collaborations/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          editorEmail: selectedEditor,
          senderEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to update role.");
        return;
      }

      // SUCCESS MESSAGE
      alert("Editor role updated successfully!");

      // Refresh UI roles
      setCollaborators((prev) =>
        prev.map((user) => ({
          ...user,
          role: user.email === selectedEditor ? "editor" : "viewer",
        }))
      );

    } catch (err: any) {
      alert("Something went wrong while updating role.");
    } finally {
      setSavingRole(false);
    }
  };


  // Create file and save in Firestore
  const handleCreateFile = async () => {
    if (!fileName || !fileExtension) {
      alert("Please enter file name and select extension.");
      return;
    }
    if (!projectId) {
      alert("Project ID missing");
      return;
    }

    try {

      console.log("Current userRole =", userRole);
      setCreating(true);

      const userEmail = localStorage.getItem("userEmail") || "unknown";
      console.log("user email ");
      const response = await fetch("/api/files/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          fileName,
          fileExtension,
          userEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to create file.");
        return;
      }
      console.log("File created with ID:", data.id);

      // console.log("File created with ID:", docRef.id);

      // // Navigate to editor page
      // router.push(
      //   `/open/editor/new?filename=${encodeURIComponent(
      //     fileName
      //   )}&extension=${encodeURIComponent(fileExtension)}&fileId=${
      //     docRef.id
      //   }&projectId=${projectId}`
      // );

      // console.log("File created with ID:", docRef.id);
      setCreating(false);
      router.push(
        `/open/editor/new?filename=${encodeURIComponent(
          fileName
        )}&extension=${encodeURIComponent(fileExtension)}&fileId=${data.id
        }&projectId=${projectId}&isAdmin=${isAdmin}&userRole=${userRole}`
      );

      setTimeout(() => {
        toast({
          title: "File Created 🎉",
          description: `${fileName}.${fileExtension} created successfully!`,
          duration: 3000,
        });
      }, 200);


    } catch (err) {
      console.error("Error creating file:", err);
      alert("Failed to create file.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Project: {projectName}</h1>
      <p className="text-gray-500">Project ID: {projectId}</p>

      {/* File creation */}
      <div className="space-y-2">
        <Label htmlFor="filename">File Name</Label>
        <Input
          id="filename"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Enter file name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileext">File Extension</Label>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading extensions...
          </div>
        ) : (
          <Select onValueChange={(val) => setFileExtension(val)}>
            <SelectTrigger id="fileext">
              <SelectValue placeholder="Select extension" />
            </SelectTrigger>
            <SelectContent>
              {extensions.map((ext, idx) => (
                <SelectItem key={idx} value={ext}>
                  .{ext}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        onClick={handleCreateFile}
        disabled={creating || userRole === "viewer"}
      >
        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {userRole === "viewer" ? "You are a Viewer" : "Create File"}
      </Button>
      {/* File list */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Project Files</h2>
        {loadingFiles ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-4 w-40 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
        ) :


          files.length === 0 ? (
            <p className="text-gray-500">No files created yet.</p>
          ) : (
            <ul className="list-disc pl-6">
              {files.map((file) => (
                <li key={file.id} className="mt-1">
                  <Button
                    variant="link"
                    onClick={() =>
                      router.push(
                        `/open/editor/new?filename=${encodeURIComponent(
                          file.file_name
                        )}&extension=${encodeURIComponent(
                          file.file_extension
                        )}&fileId=${file.id}&projectId=${projectId}&isAdmin=${isAdmin}&userRole=${userRole}`
                      )
                    }
                  >
                    {file.file_name}.{file.file_extension}
                  </Button>
                </li>
              ))}
            </ul>
          )}
      </div>
      {isAdmin && (
        <div className="mt-10 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">Manage Collaborators</h2>

          {loadingCollab ? (
            <div className="space-y-3 mt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          ) :

            collaborators.length === 0 ? (
              <p className="text-gray-500 mt-2">No collaborators found.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-500">
                  Select one collaborator as <b>Editor</b>. Others will become viewers.
                </p>

                <div className="mt-4 space-y-3">
                  {collaborators.map((c) => (
                    <div key={c.email} className="flex items-center justify-between">
                      <p className="text-sm">{c.email}</p>

                      <input
                        type="radio"
                        name="editor"
                        checked={selectedEditor === c.email}
                        onChange={() => setSelectedEditor(c.email)}
                        className="h-4 w-4"
                      />
                    </div>
                  ))}
                </div>

                <Button
                  className="mt-4 px-4 py-1 h-8 text-sm w-auto self-end"
                  onClick={updateRole}
                  disabled={savingRole

                  }
                >
                  {savingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </>
            )}
        </div>
      )}
    </div>
  );
}
