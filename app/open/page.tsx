"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

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

  // const [isCollaborator, setIsCollaborator] = useState(false);

  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingCollab, setLoadingCollab] = useState(true);
  const [loadingRole, setLoadingRole] = useState(true);

  const [completed, setCompleted] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [processingFileId, setProcessingFileId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>("");

  const handleRenameFile = async (fileId: string) => {
    if (!renameValue.trim()) return;

    try {
      setProcessingFileId(fileId);

      const res = await fetch("/api/files/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          newFileName: renameValue.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, file_name: renameValue.trim() } : f
        )
      );

      toast.success("File Renamed ✅");
        

      setEditingFileId(null);
    } catch (err: any) {
      toast.error("Rename Failed ❌");
        
    } finally {
      setProcessingFileId(null);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this file?");
    if (!confirmDelete) return;

    try {
      setProcessingFileId(fileId);

      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setFiles((prev) => prev.filter((f) => f.id !== fileId));

      toast.success("File Deleted 🗑️");
       
    } catch (err: any) {
      toast.error("Delete Failed ❌");
        
    } finally {
      setProcessingFileId(null);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      setLoadingComplete(true);

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Check again before marking
      const check = await fetch(
        `/api/project/status/get?userEmail=${userEmail}&projectId=${projectId}`
      );
      const cdata = await check.json();

      if (cdata.completed) {
        setCompleted(true);
        return;
      }

      // Mark as completed
      const res = await fetch(`/api/project/status/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          projectId,
          projectTitle: projectName,
        }),
      });

  

      if (res.ok) {
        setCompleted(true);
      }
    } catch (err) {
    
      toast.error("Failed to mark project as completed.");
    } finally {
      setLoadingComplete(false);
    }
  };

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
        toast.error("Failed to load file extensions.");
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
        toast.error("Failed to load project files.");
      } finally {
        setLoadingFiles(false);
      }
    };

    const checkStatus = async () => {
      let url = `/api/project/status/get?projectId=${projectId}`;

      const userEmail = localStorage.getItem("userEmail");

      if (!userEmail) return;
      if (isAdmin && userEmail) {
        url += `&userEmail=${userEmail}`;
      }
      const res = await fetch(url);
      const data = await res.json();

      setCompleted(data.completed);
    };
    checkStatus();

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
        const res = await fetch("/api/collaborations/check-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            userEmail,
          }),
        });

        const data = await res.json();
        setUserRole(data.role);
        setIsAdmin(data.isAdmin);
        // setIsCollaborator(data.isCollaborator);

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

      setCreating(true);

      const userEmail = localStorage.getItem("userEmail") || "unknown";

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

      setCreating(false);
      router.push(
        `/open/editor/new?filename=${encodeURIComponent(
          fileName
        )}&extension=${encodeURIComponent(fileExtension)}&fileId=${
          data.id
        }&projectId=${projectId}&isAdmin=${isAdmin}&userRole=${userRole}`
      );

      setTimeout(() => {
        toast.success("File Created 🎉");
      }, 200);
    } catch (err) {
    
      toast.error("Failed to create file. ");
    } finally {
      setCreating(false);
    }
  };

  // Helper: format date safely


  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Project: {projectName}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Project ID: {projectId}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!loadingRole && isAdmin && (
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/version-history?projectId=${projectId}`)
              }
            >
              View Version History
            </Button>
          )}

          {isAdmin && (
            <Button
              onClick={handleMarkCompleted}
              disabled={loadingComplete || completed}
              className={`flex items-center gap-2 ${
                completed
                  ? "bg-slate-400 text-slate-800 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {loadingComplete ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : completed ? (
                "Project Completed"
              ) : (
                "Mark as Completed"
              )}
            </Button>
          )}

          {!isAdmin && (
            <div className="ml-3 flex items-center">
              {loadingComplete ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : completed ? (
                <span className="text-emerald-500 font-medium">
                  Project Completed
                </span>
              ) : (
                ""
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create file card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Create New File
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Add a file to this project. Files will open in the editor.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label
              htmlFor="filename"
              className="text-slate-700 dark:text-slate-200"
            >
              File Name
            </Label>
            <Input
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              aria-label="File name"
              className="mt-1"
            />
          </div>

          <div>
            <Label
              htmlFor="fileext"
              className="text-slate-700 dark:text-slate-200"
            >
              Extension
            </Label>
            <div className="mt-1">
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading extensions...
                </div>
              ) : (
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                    >
                      {value ? `.${value}` : "Select extension"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search extension..." />
                      <CommandList>
                        <CommandEmpty>No extension found.</CommandEmpty>
                        <CommandGroup>
                          {extensions.map((ext) => (
                            <CommandItem
                              key={ext}
                              value={ext}
                              onSelect={(currentValue) => {
                                setValue(currentValue);
                                setFileExtension(currentValue);
                                setOpen(false);
                              }}
                            >
                              .{ext}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  value === ext ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleCreateFile}
            disabled={creating || userRole === "viewer"}
            className="h-10"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {userRole === "viewer" ? "You are a Viewer" : "Create File"}
          </Button>

          {/* <div className="text-sm text-slate-600 dark:text-slate-300">Role: <span className="font-medium">{userRole || '—'}</span></div> */}
        </div>
      </div>

      {/* Files list */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Project Files
        </h2>

        <div className="mt-4">
          {loadingFiles ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 w-full rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
                />
              ))}
            </div>
          ) : files.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-300">
              No files created yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    {editingFileId === file.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8"
                        />

                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={processingFileId === file.id}
                          onClick={() => handleRenameFile(file.id)}
                        >
                          {processingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingFileId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {file.file_name}.{file.file_extension}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {/* {file.createdBy || "unknown"} • {formatDate(file.createdAt)} */}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 👉 ACTIONS */}
                  <div className="flex items-center gap-2 ml-2">
                    {/* ✅ OPEN – AVAILABLE TO ALL ROLES */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        router.push(
                          `/open/editor/new?filename=${encodeURIComponent(
                            file.file_name
                          )}&extension=${encodeURIComponent(
                            file.file_extension
                          )}&fileId=${
                            file.id
                          }&projectId=${projectId}&isAdmin=${isAdmin}&userRole=${userRole}`
                        )
                      }
                    >
                      Open
                    </Button>

                    {/* 🔐 ADMIN ONLY */}
                    {isAdmin && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingFileId(file.id);
                            setRenameValue(file.file_name);
                          }}
                          disabled={processingFileId === file.id}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteFile(file.id)}
                          disabled={processingFileId === file.id}
                        >
                          {processingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manage collaborators (admin only) */}
      {isAdmin && (
        <div className="mt-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Manage Collaborators
          </h2>

          {loadingCollab ? (
            <div className="space-y-3 mt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-slate-300 dark:bg-slate-600 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              No collaborators found.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Select one collaborator as <b>Editor</b>. Others will become
                viewers.
              </p>

              <div className="mt-4 space-y-2">
                {collaborators.map((c) => (
                  <div
                    key={c.email}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {c.email}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {c.role || "viewer"}
                      </div>
                    </div>

                    <div>
                      <input
                        type="radio"
                        name="editor"
                        checked={selectedEditor === c.email}
                        onChange={() => setSelectedEditor(c.email)}
                        className="h-4 w-4 text-emerald-500"
                        aria-label={`Select ${c.email} as editor`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  className="px-4 py-1 h-9 text-sm"
                  onClick={updateRole}
                  disabled={savingRole}
                >
                  {savingRole && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
