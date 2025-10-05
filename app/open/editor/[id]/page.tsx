"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

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

  const editorRef = useRef<any>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

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

  // Initialize Yjs for collaborative editing
  useEffect(() => {
    if (!fileId) return;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // You can run your own websocket server or use a public one (for testing only)
    const provider = new WebsocketProvider(
      "wss://demos.yjs.dev", // replace with your server if needed
      `project-${fileId}`,
      ydoc
    );

    const yText = ydoc.getText("monaco");

    const disposeMonacoBinding = () => {
      if (editorRef.current) {
        new MonacoBinding(yText, editorRef.current.getModel(), new Set([editorRef.current]), provider.awareness);
      }
    };

    // Cleanup on unmount
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [fileId]);

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
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
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

      <div className="flex flex-1">
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800">
            <h3 className="font-medium text-sm text-gray-300">Editor</h3>
          </div>
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage={extension}
            value={code}
            onMount={(editor) => {
                const model = editor.getModel();
                if (!model) return; // Guard against null
              editorRef.current = editor;
              // Initialize MonacoBinding here if Yjs already loaded
              if (ydocRef.current) {
                const provider = new WebsocketProvider(
                  "wss://demos.yjs.dev",
                  `project-${fileId}`,
                  ydocRef.current
                );
                 new MonacoBinding(
      ydocRef.current.getText("monaco"),
      model, // guaranteed non-null now
      new Set([editor]),
      provider.awareness
    );
              }
            }}
            onChange={(val) => handleAutoSave(val || "")}
          />
        </div>

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
