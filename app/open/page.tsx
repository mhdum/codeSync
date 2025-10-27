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
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // 🔥 ensure firebase is initialized

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
        const q = query(
          collection(db, "project_files"),
          where("project_id", "==", projectId)
        );
        const snap = await getDocs(q);
        const list: ProjectFile[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setFiles(list);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    fetchFiles();
  }, [projectId]);

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

      const docRef = await addDoc(collection(db, "project_files"), {
        project_id: projectId,
        file_name: fileName,
        file_extension: fileExtension,
        createdBy: userEmail,
        content: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // console.log("File created with ID:", docRef.id);

      // // Navigate to editor page
      // router.push(
      //   `/open/editor/new?filename=${encodeURIComponent(
      //     fileName
      //   )}&extension=${encodeURIComponent(fileExtension)}&fileId=${
      //     docRef.id
      //   }&projectId=${projectId}`
      // );

      console.log("File created with ID:", docRef.id);

router.push(
  `/open/editor/new?filename=${encodeURIComponent(
    fileName
  )}&extension=${encodeURIComponent(fileExtension)}&fileId=${
    docRef.id
  }&projectId=${projectId}`
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

      <Button onClick={handleCreateFile} disabled={creating}>
        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create File
      </Button>

      {/* File list */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Project Files</h2>
        {files.length === 0 ? (
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
                      )}&fileId=${file.id}&projectId=${projectId}`
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
    </div>
  );
}
