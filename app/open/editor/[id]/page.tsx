"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export default function ProjectEditorPage() {
  const params = useSearchParams();
  const filename = params.get("filename") || "untitled";
  const extension = params.get("extension") || "js";
  const fileId = params.get("fileId") || "";

  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isLeader, setIsLeader] = useState(false);

  // ✅ Initialize Yjs + Load Firestore content only once
  useEffect(() => {
    if (!fileId) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      `wss://yjs-websocket-server-hfb8.onrender.com/collaboration/${fileId}`, // public demo WebSocket
      "",
      ydoc
    );

    const yText = ydoc.getText("monaco");
    ydocRef.current = ydoc;
    providerRef.current = provider;
    yTextRef.current = yText;

    // Load Firestore content only if Yjs doc is empty
    const init = async () => {
      try {
        if (yText.length === 0) {
          const fileRef = doc(db, "project_files", fileId);
          const fileSnap = await getDoc(fileRef);
          if (fileSnap.exists()) {
            const data = fileSnap.data();
            // const initialContent = data.content || "// Start coding here...";
            const initialContent = "";
            yText.insert(0, initialContent);
          }
        }
      } catch (err) {
        console.error("Error loading Firestore content:", err);
      }
    };
    init();

    // ✅ Elect a leader tab (lowest random clientID wins)
    const awareness = provider.awareness;
    const clientId = ydoc.clientID;
    awareness.setLocalStateField("clientId", clientId);

    const electLeader = () => {
      const states = Array.from(awareness.getStates().values());
      const ids = states.map((s) => s.clientId).filter(Boolean);
      const minId = Math.min(...ids);
      setIsLeader(clientId === minId);
    };

    awareness.on("update", electLeader);
    electLeader(); // run initially

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [fileId]);

  // ✅ Setup Monaco binding
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    const model = editor.getModel();
    if (!model || !yTextRef.current || !providerRef.current) return;

    new MonacoBinding(
      yTextRef.current,
      model,
      new Set([editor]),
      providerRef.current.awareness
    );

    // When Yjs doc updates, only leader will save periodically
    const ydoc = ydocRef.current;
    if (ydoc) {
      ydoc.on("update", () => {
        if (isLeader) {
          const newCode = model.getValue();
          handleAutoSave(newCode);
        }
      });
    }
  };

  // ✅ Debounced auto-save (only leader tab)
  const handleAutoSave = (newCode: string) => {
    if (!fileId || !isLeader) return;

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
        console.error("Error saving Firestore:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  };

  // ✅ Run code
  const handleRun = async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
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
      setOutput(result.run?.output || "No output");
    } catch (err) {
      console.error("Run error:", err);
      setOutput("Error running code");
    } finally {
      setIsRunning(false);
    }
  };

  


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800">
        <h2 className="font-semibold text-lg">
          Editing:{" "}
          <span className="text-blue-400">
            {filename}.{extension}
          </span>
          {isSaving && (
            <span className="ml-2 text-sm text-gray-400 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {isLeader ? "Leader tab (saving enabled)" : "Viewer tab (sync only)"}
          </span>
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
      </div>

      {/* Editor & Output */}
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800">
            <h3 className="font-medium text-sm text-gray-300">Editor</h3>
          </div>
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage={extension}
            defaultValue="// Start coding here..."
            onMount={handleEditorMount}
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
