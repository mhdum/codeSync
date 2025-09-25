"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // Make sure Firebase is initialized

export default function ProjectEditorPage() {
  const params = useSearchParams();
  const filename = params.get("filename") || "untitled";
  const extension = params.get("extension") || "js";
  const fileId = params.get("fileId") || "";
  const projectId = params.get("projectId") || "";

  const [code, setCode] = useState("// Start coding here...");
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load initial content from Firestore
  useEffect(() => {
    if (!fileId) return;

    const fetchFileContent = async () => {
      try {
        const fileRef = doc(db, "project_files", fileId);
        const fileSnap = await getDoc(fileRef);
        if (fileSnap.exists()) {
          const data = fileSnap.data();
          setCode(data.content || "// Start coding here...");
        }
      } catch (err) {
        console.error("Error fetching file content:", err);
      }
    };

    fetchFileContent();
  }, [fileId]);

  // Auto-save function (debounced)
  const handleAutoSave = (newCode: string) => {
    setCode(newCode);

    if (!fileId) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const fileRef = doc(db, "project_files", fileId);
        await updateDoc(fileRef, {
          content: newCode,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error auto-saving file:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Save 1s after last keystroke
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("");
    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: extension,
          version: "*",
          files: [{ name: filename, content: code }],
        }),
      });

      const result = await res.json();
      if (result.run) {
        setOutput(result.run.output || "No output");
      } else {
        setOutput("No output");
      }
    } catch (err) {
      console.error("Run error:", err);
      setOutput("Error running code");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800">
        <h2 className="font-semibold text-lg">
          Editing: <span className="text-blue-400">{filename}.{extension}</span>
          {isSaving && (
            <span className="ml-2 text-sm text-gray-400 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...
            </span>
          )}
        </h2>

        <Button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Running...
            </>
          ) : (
            "Run Code"
          )}
        </Button>
      </div>

      {/* Split Editor + Output */}
      <div className="flex flex-1">
        {/* Editor Section */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800">
            <h3 className="font-medium text-sm text-gray-300">Editor</h3>
          </div>
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage={extension}
            value={code}
            onChange={(val) => handleAutoSave(val || "")}
          />
        </div>

        {/* Output Section */}
        <div className="w-1/3 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800">
            <h3 className="font-medium text-sm text-gray-300">Output</h3>
          </div>
          <div className="flex-1 p-3 bg-black text-green-400 font-mono overflow-auto">
            {isRunning ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Running code...
              </div>
            ) : (
              <pre>{output}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
